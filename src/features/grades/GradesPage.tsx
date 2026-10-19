import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Check, ClipboardCheck, Plus, Save, Users } from "lucide-react";

import { useTeacherWorkspaceApi } from "@/app/providers";
import { LoadError } from "@/components/feedback";
import {
  Button,
  EmptyState,
  FilterDropdown,
  FormField,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  StudentAvatar,
} from "@/components/ui";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  errorMessage,
  gradeValidationError,
  initialsOf,
  toApiGrade,
} from "@/lib/format";
import type { TeacherAssessment, TeacherAssignment, TeacherStudent } from "@/types/academic";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

function assignmentLabel(assignment: TeacherAssignment): string {
  return `${assignment.subject} · ${assignment.grade}° ${assignment.group}`;
}

function levelOf(grade: number): { label: string; tone: BadgeTone } {
  if (grade < 3) return { label: "Bajo", tone: "danger" };
  if (grade >= 4) return { label: "Alto", tone: "success" };
  return { label: "Medio", tone: "warning" };
}

/**
 * Assessments and grades of one assignment. The API has no read endpoint for the assessments, so
 * the list holds the ones created in this session; the accumulated weight is the sum of their
 * real weights.
 */
export default function GradesPage() {
  const api = useTeacherWorkspaceApi();
  const { accessToken } = useAuthSession();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [assessments, setAssessments] = useState<TeacherAssessment[] | null>(null);
  const [accumulatedWeight, setAccumulatedWeight] = useState<number | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [grades, setGrades] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [assessmentsError, setAssessmentsError] = useState<string | null>(null);
  const [gradesError, setGradesError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [period, setPeriod] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getAssignments(accessToken)
      .then((response) => {
        if (!active) return;
        setAssignments(response.assignments);
        setSelectedAssignmentId((current) => current ?? response.assignments[0]?.id ?? null);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught, "No pudimos cargar tus asignaciones."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

  useEffect(() => {
    if (!accessToken || selectedAssignmentId === null) return;
    let active = true;

    api
      .getStudents(selectedAssignmentId, accessToken)
      .then((response) => {
        if (active) setStudents(response.students);
      })
      .catch((caught) => {
        if (active) setStudentsError(errorMessage(caught, "No pudimos cargar los estudiantes."));
      })
      .finally(() => {
        if (active) setLoadingStudents(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, selectedAssignmentId]);

  useEffect(() => {
    if (!accessToken || selectedAssignmentId === null) return;
    let active = true;

    setLoadingAssessments(true);
    setAssessmentsError(null);
    setAssessments(null);
    setAccumulatedWeight(null);

    api
      .getAssessments(selectedAssignmentId, accessToken)
      .then((response) => {
        if (!active) return;
        setAssessments(response.assessments);
        setAccumulatedWeight(response.accumulatedWeight);
      })
      .catch((caught) => {
        if (active)
          setAssessmentsError(errorMessage(caught, "No pudimos cargar las evaluaciones."));
      })
      .finally(() => {
        if (active) setLoadingAssessments(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, selectedAssignmentId]);

  useEffect(() => {
    if (!accessToken || selectedAssessmentId === null) return;
    let active = true;

    setLoadingGrades(true);
    setGradesError(null);
    setGrades({});

    api
      .getAssessmentGrades(selectedAssessmentId, accessToken)
      .then((response) => {
        if (!active) return;
        const next: Record<number, string> = {};
        response.records.forEach((record) => {
          if (record.grade !== null) next[record.studentId] = String(record.grade);
        });
        setGrades(next);
      })
      .catch((caught) => {
        if (active) setGradesError(errorMessage(caught, "No pudimos cargar las notas registradas."));
      })
      .finally(() => {
        if (active) setLoadingGrades(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, selectedAssessmentId]);

  const assignment = useMemo(
    () => assignments.find((item) => item.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );

  const selectedAssessment = useMemo(
    () => (assessments ?? []).find((item) => item.id === selectedAssessmentId) ?? null,
    [assessments, selectedAssessmentId],
  );

  const gradeErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    students.forEach((student) => {
      const raw = grades[student.id];
      if (raw === undefined || raw.trim() === "") return;
      const invalid = gradeValidationError(raw);
      if (invalid) errors[student.id] = invalid;
    });
    return errors;
  }, [grades, students]);

  const invalid = Object.keys(gradeErrors).length > 0;

  const handleCreateAssessment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setWriteError(null);
    setSaved(false);

    if (selectedAssignmentId === null) {
      setFormError("Selecciona una asignación.");
      return;
    }
    if (!name.trim()) {
      setFormError("Escribe el nombre de la evaluación.");
      return;
    }
    const numericWeight = Number(weight);
    if (!weight || !Number.isInteger(numericWeight) || numericWeight < 0 || numericWeight > 100) {
      setFormError("La ponderación debe ser un entero entre 0 y 100.");
      return;
    }
    const numericPeriod = Number(period);
    if (!period || !Number.isInteger(numericPeriod) || numericPeriod < 1) {
      setFormError("Indica un período válido.");
      return;
    }
    if (!accessToken) return;

    setBusy(true);
    try {
      const created = await api.createAssessment(
        selectedAssignmentId,
        { name: name.trim(), weight: numericWeight, period: numericPeriod },
        accessToken,
      );
      setName("");
      setWeight("");
      setPeriod("");
      setFormOpen(false);
      setFormError(null);
      try {
        const response = await api.getAssessments(selectedAssignmentId, accessToken);
        setAssessments(response.assessments);
        setAccumulatedWeight(response.accumulatedWeight);
        setSelectedAssessmentId(created.id);
        setGrades({});
      } catch (caught) {
        setWriteError(
          errorMessage(caught, "La evaluación se creó, pero no pudimos actualizar el listado."),
        );
      }
    } catch (caught) {
      setFormError(
        errorMessage(caught, "No pudimos crear la evaluación. Intenta de nuevo."),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveGrades = async (): Promise<void> => {
    setWriteError(null);
    setSaved(false);

    if (selectedAssessmentId === null) {
      setWriteError("Selecciona una evaluación antes de guardar las notas.");
      return;
    }
    if (invalid) {
      setWriteError("Corrige las notas marcadas antes de guardar.");
      return;
    }
    if (!accessToken) return;

    const records = students
      .filter((student) => {
        const raw = grades[student.id];
        return raw !== undefined && raw.trim() !== "";
      })
      .map((student) => ({ studentId: student.id, grade: toApiGrade(grades[student.id] ?? "") }));

    if (records.length === 0) {
      setWriteError("Registra al menos una nota antes de guardar.");
      return;
    }

    setBusy(true);
    try {
      await api.saveGrades(selectedAssessmentId, { records }, accessToken);
      setSaved(true);
      try {
        const response = await api.getAssessmentGrades(selectedAssessmentId, accessToken);
        const next: Record<number, string> = {};
        response.records.forEach((record) => {
          if (record.grade !== null) next[record.studentId] = String(record.grade);
        });
        setGrades(next);
      } catch (caught) {
        setWriteError(
          errorMessage(caught, "Las notas se guardaron, pero no pudimos actualizar el listado."),
        );
      }
    } catch (caught) {
      setWriteError(errorMessage(caught, "No pudimos guardar las notas. Intenta de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <LoadingSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page">
        <PageHeader eyebrow="REGISTRO DE EVALUACIONES" title="Calificaciones del grupo" />
        <LoadError message={loadError} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          assignment ? `REGISTRO DE EVALUACIONES · ${assignmentLabel(assignment)}` : "REGISTRO DE EVALUACIONES"
        }
        title="Calificaciones del grupo"
        description="Registra evaluaciones y notas. No incluye la calificación de trabajos entregados."
        action={
          <Button onClick={() => setFormOpen(true)} disabled={assignments.length === 0}>
            <Plus /> Crear evaluación
          </Button>
        }
      />

      {assignments.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={ClipboardCheck}
            title="Sin asignaciones"
            description="Necesitas al menos una asignación para registrar evaluaciones y notas."
          />
        </section>
      ) : (
        <>
          <div className="table-toolbar">
            <FilterDropdown
              label="Asignación"
              value={selectedAssignmentId ?? ""}
              onChange={(event) => {
                setSelectedAssignmentId(Number(event.target.value));
                setLoadingStudents(true);
                setStudentsError(null);
                setStudents([]);
                setGrades({});
                setAssessments(null);
                setAccumulatedWeight(null);
                setSelectedAssessmentId(null);
                setAssessmentsError(null);
                setGradesError(null);
                setSaved(false);
                setWriteError(null);
              }}
            >
              {assignments.map((item) => (
                <option key={item.id} value={item.id}>
                  {assignmentLabel(item)}
                </option>
              ))}
            </FilterDropdown>
            <FilterDropdown
              label="Evaluación"
              value={selectedAssessmentId ?? ""}
              disabled={(assessments ?? []).length === 0}
              onChange={(event) => {
                setSelectedAssessmentId(Number(event.target.value));
                setGrades({});
                setSaved(false);
              }}
            >
              <option value="" disabled>
                {(assessments ?? []).length === 0 ? "Sin evaluaciones" : "Seleccionar evaluación"}
              </option>
              {(assessments ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.weight}%
                </option>
              ))}
            </FilterDropdown>
          </div>

          <section className="card evaluation-header">
            <div>
              <span className="eyebrow">EVALUACIÓN SELECCIONADA</span>
              <h2>{selectedAssessment ? selectedAssessment.name : "Sin evaluación seleccionada"}</h2>
              <p>
                {selectedAssessment
                  ? `Ponderación: ${selectedAssessment.weight}% · Período ${selectedAssessment.period ?? "—"}`
                  : "Crea una evaluación para comenzar el registro de notas."}
              </p>
            </div>
            <div className="weight-progress">
              <div>
                <span>Ponderación acumulada</span>
                <strong data-testid="accumulated-weight">
                  {accumulatedWeight === null ? "—" : `${accumulatedWeight}%`}
                </strong>
              </div>
              <div className="progress-track">
                <span
                  style={{ width: `${Math.min(accumulatedWeight ?? 0, 100)}%` }}
                />
              </div>
              <small>
                {accumulatedWeight === null
                  ? "No disponible."
                  : accumulatedWeight >= 100
                    ? "La ponderación del período está completa."
                    : `Promedios provisionales: falta ${100 - accumulatedWeight}% de ponderación.`}
              </small>
            </div>
          </section>

          {studentsError && (
            <p className="field-error" role="alert">
              {studentsError}
            </p>
          )}

          {assessmentsError && (
            <p className="field-error" role="alert">
              {assessmentsError}
            </p>
          )}

          {gradesError && (
            <p className="field-error" role="alert">
              {gradesError}
            </p>
          )}

          <section className="card grades-card">
            <div className="table-toolbar">
              <div>
                <h2>Registro de notas</h2>
                <p>
                  {students.length} estudiantes ·{" "}
                  {selectedAssessment
                    ? `notas de ${selectedAssessment.name}`
                    : "selecciona una evaluación"}
                </p>
              </div>
            </div>

            {loadingStudents ? (
              <LoadingSkeleton />
            ) : students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sin estudiantes"
                description="La asignación no tiene estudiantes con matrícula activa."
              />
            ) : (
              <>
                {loadingAssessments && (
                  <p className="field-hint" role="status">
                    Cargando evaluaciones…
                  </p>
                )}
                {(assessments ?? []).length === 0 && !loadingAssessments && !assessmentsError && (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="Sin evaluaciones"
                    description="La asignación no tiene evaluaciones registradas para el período."
                  />
                )}
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Nota</th>
                        <th>Nivel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const raw = grades[student.id] ?? "";
                        const studentError = gradeErrors[student.id];
                        const numeric = raw.trim() === "" ? null : toApiGrade(raw);
                        const level = numeric !== null && !studentError ? levelOf(numeric) : null;
                        return (
                          <tr key={student.id}>
                            <td>
                              <div className="student-cell">
                                <StudentAvatar
                                  initials={initialsOf(student.nombres, student.apellidos)}
                                />
                                <strong>
                                  {student.nombres} {student.apellidos}
                                </strong>
                              </div>
                            </td>
                            <td>
                              <div className={`grade-input ${studentError ? "input-error" : ""}`}>
                                <input
                                  aria-label={`Calificación de ${student.nombres} ${student.apellidos}`}
                                  type="number"
                                  min="0"
                                  max="5"
                                  step="0.1"
                                  disabled={!selectedAssessment || loadingGrades}
                                  value={raw}
                                  onChange={(event) => {
                                    setSaved(false);
                                    setGrades((current) => ({
                                      ...current,
                                      [student.id]: event.target.value,
                                    }));
                                  }}
                                />
                                <span>/ 5,0</span>
                              </div>
                              {studentError && <span className="inline-error">{studentError}</span>}
                            </td>
                            <td>
                              {level ? (
                                <StatusBadge tone={level.tone}>{level.label}</StatusBadge>
                              ) : (
                                <StatusBadge tone="neutral">Sin nota</StatusBadge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="attendance-footer">
                  <div>
                    {writeError && (
                      <p className="field-error" role="alert">
                        {writeError}
                      </p>
                    )}
                    {saved && (
                      <div className="success-message" role="status">
                        <Check /> Notas guardadas correctamente.
                      </div>
                    )}
                    {!saved && !writeError && (
                      <span>Los promedios son provisionales hasta completar el 100%.</span>
                    )}
                  </div>
                  <Button onClick={handleSaveGrades} disabled={busy || invalid || !selectedAssessment}>
                    <Save /> {busy ? "Guardando…" : "Guardar notas"}
                  </Button>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {formOpen && (
        <div className="drawer-backdrop" onMouseDown={() => setFormOpen(false)}>
          <aside
            className="form-drawer evaluation-form"
            aria-label="Crear evaluación"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">NUEVA EVALUACIÓN</p>
                <h2>Crear evaluación</h2>
                <p>Define los datos antes de registrar las notas del grupo.</p>
              </div>
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                Cerrar
              </Button>
            </div>

            <form onSubmit={handleCreateAssessment} noValidate>
              {formError && (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              )}

              <FormField label="Nombre">
                <input
                  required
                  type="text"
                  value={name}
                  placeholder="Ej. Evaluación de geometría"
                  onChange={(event) => setName(event.target.value)}
                />
              </FormField>

              <FormField label="Ponderación (%)" hint="La suma activa del período no puede superar el 100%.">
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                />
              </FormField>

              <FormField label="Período">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                />
              </FormField>

              <div className="drawer-actions">
                <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Creando…" : "Crear evaluación"}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
