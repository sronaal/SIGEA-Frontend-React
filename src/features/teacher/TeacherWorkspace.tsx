import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router";

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
  formatDate,
  formatDateTime,
  formatGrade,
  formatPercentage,
  gradeValidationError,
  initialsOf,
  toApiGrade,
} from "@/lib/format";
import type {
  ActivitySubmissions,
  ActivityStatus,
  SubmissionStatus,
  TeacherActivity,
  TeacherAssignment,
  TeacherStudent,
  TeacherSubmission,
} from "@/types/academic";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  BORRADOR: "Borrador",
  PUBLICADA: "Publicada",
};

const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  PENDIENTE: "Pendiente",
  ENTREGADA: "Entregada",
  CALIFICADA: "Calificada",
};

const SUBMISSION_STATUS_TONES: Record<SubmissionStatus, BadgeTone> = {
  PENDIENTE: "warning",
  ENTREGADA: "info",
  CALIFICADA: "success",
};

function assignmentLabel(assignment: TeacherAssignment): string {
  return `${assignment.subject} · ${assignment.grade}° ${assignment.group}`;
}

/** Activity created in this session with the assignment it belongs to. */
interface ActivityRow {
  activity: TeacherActivity;
  assignmentLabel: string;
}

/** Groups of the professor: assignment selector and the students of the selected group. */
export function TeacherGroupsPage() {
  const api = useTeacherWorkspaceApi();
  const { accessToken } = useAuthSession();
  const [assignments, setAssignments] = useState<TeacherAssignment[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [students, setStudents] = useState<TeacherStudent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getAssignments(accessToken)
      .then((response) => {
        if (!active) return;
        setAssignments(response.assignments);
        setSelectedId((current) => current ?? response.assignments[0]?.id ?? null);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar tus asignaciones."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

  useEffect(() => {
    if (!accessToken || selectedId === null) return;
    let active = true;

    api
      .getStudents(selectedId, accessToken)
      .then((response) => {
        if (active) setStudents(response.students);
      })
      .catch((caught) => {
        if (active)
          setStudentsError(errorMessage(caught, "No pudimos cargar los estudiantes del grupo."));
      })
      .finally(() => {
        if (active) setLoadingStudents(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, selectedId]);

  const selected = useMemo(
    () => assignments?.find((assignment) => assignment.id === selectedId) ?? null,
    [assignments, selectedId],
  );

  if (loading) {
    return (
      <div className="page">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <PageHeader eyebrow="CARGA ACADÉMICA" title="Mis grupos y asignaturas" />
        <LoadError message={error} />
      </div>
    );
  }

  if (!assignments) return null;

  return (
    <div className="page">
      <PageHeader
        eyebrow={selected ? `CARGA ACADÉMICA · ${selected.academicYear}` : "CARGA ACADÉMICA"}
        title="Mis grupos y asignaturas"
        description="Selecciona una asignación para consultar estudiantes y acciones disponibles."
      />

      {assignments.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={Users}
            title="Sin asignaciones"
            description="Cuando la institución te asigne grupos aparecerán en este panel."
          />
        </section>
      ) : (
        <div className="groups-layout">
          <aside className="group-list" aria-label="Asignaciones">
            {assignments.map((assignment) => (
              <button
                type="button"
                key={assignment.id}
                className={`card group-option ${selectedId === assignment.id ? "active" : ""}`}
                aria-pressed={selectedId === assignment.id}
                onClick={() => {
                  setSelectedId(assignment.id);
                  setLoadingStudents(true);
                  setStudentsError(null);
                }}
              >
                <div className="module-icon">
                  <BookOpen />
                </div>
                <div>
                  <strong>{assignment.subject}</strong>
                  <span>
                    {assignment.grade}° {assignment.group} · {assignment.studentCount} estudiantes
                  </span>
                </div>
                <ChevronRight />
              </button>
            ))}
          </aside>

          <section className="card group-detail">
            {selected && (
              <>
                <div className="group-detail-head">
                  <div>
                    <span className="eyebrow">ASIGNACIÓN SELECCIONADA</span>
                    <h2>{assignmentLabel(selected)}</h2>
                    <p>
                      {selected.studentCount} estudiantes matriculados · Año {selected.academicYear} ·
                      Período {selected.period ?? "—"}
                    </p>
                  </div>
                  <div className="group-actions">
                    <Link className="btn btn-secondary" to="/profesor/asistencia">
                      <CalendarCheck /> Asistencia
                    </Link>
                    <Link className="btn btn-secondary" to="/profesor/actividades">
                      <Plus /> Actividad
                    </Link>
                    <Link className="btn btn-primary" to="/profesor/calificaciones">
                      <ClipboardCheck /> Calificaciones
                    </Link>
                  </div>
                </div>

                {studentsError && (
                  <p className="field-error" role="alert">
                    {studentsError}
                  </p>
                )}

                {loadingStudents ? (
                  <LoadingSkeleton />
                ) : students && students.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Sin estudiantes"
                    description="La asignación no tiene estudiantes con matrícula activa."
                  />
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Estudiante</th>
                          <th>Documento</th>
                          <th>Promedio</th>
                          <th>Asistencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(students ?? []).map((student) => (
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
                            <td>{student.numeroDocumento}</td>
                            <td>{formatGrade(student.average)}</td>
                            <td>{formatPercentage(student.attendancePercentage)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/** Activities of the professor: create as draft or published, and publish a draft. */
export function TeacherActivitiesPage() {
  const api = useTeacherWorkspaceApi();
  const { accessToken } = useAuthSession();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getAssignments(accessToken)
      .then((response) => {
        if (!active) return;
        setAssignments(response.assignments);
        setSelectedId((current) => current ?? response.assignments[0]?.id ?? null);
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

  const resetForm = (): void => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setFormError(null);
  };

  const handleCreate = async (status: ActivityStatus): Promise<void> => {
    setFormError(null);
    setWriteError(null);
    setMessage(null);

    if (selectedId === null) {
      setFormError("Selecciona una asignación.");
      return;
    }
    if (!title.trim()) {
      setFormError("Escribe el título de la actividad.");
      return;
    }
    if (!description.trim()) {
      setFormError("Describe las instrucciones de la actividad.");
      return;
    }
    if (!dueDate) {
      setFormError("Indica la fecha límite.");
      return;
    }
    const assignment = assignments.find((item) => item.id === selectedId);
    if (!assignment || !accessToken) return;

    setBusy(true);
    try {
      const created = await api.createActivity(
        selectedId,
        {
          title: title.trim(),
          description: description.trim(),
          dueDate,
          status,
        },
        accessToken,
      );
      setActivities((current) => [
        { activity: created, assignmentLabel: assignmentLabel(assignment) },
        ...current,
      ]);
      setFormOpen(false);
      resetForm();
      setMessage(
        status === "PUBLICADA"
          ? "Actividad publicada correctamente."
          : "Actividad guardada como borrador.",
      );
    } catch (caught) {
      setFormError(errorMessage(caught, "No pudimos crear la actividad. Intenta de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async (activityId: number): Promise<void> => {
    setWriteError(null);
    setMessage(null);
    if (!accessToken) return;

    setBusy(true);
    try {
      const published = await api.publishActivity(activityId, accessToken);
      setActivities((current) =>
        current.map((row) =>
          row.activity.id === activityId ? { ...row, activity: published } : row,
        ),
      );
      setMessage("Actividad publicada correctamente.");
    } catch (caught) {
      setWriteError(errorMessage(caught, "No pudimos publicar la actividad."));
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
        <PageHeader eyebrow="TRABAJO DE CLASE" title="Actividades" />
        <LoadError message={loadError} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="TRABAJO DE CLASE"
        title="Actividades"
        description="Crea, publica y consulta las entregas de tus asignaturas."
        action={
          <Button onClick={() => setFormOpen(true)} disabled={assignments.length === 0}>
            <Plus /> Crear actividad
          </Button>
        }
      />

      {message && (
        <div className="success-banner" role="status">
          <Check /> {message}
        </div>
      )}

      {writeError && (
        <p className="field-error" role="alert">
          {writeError}
        </p>
      )}

      {assignments.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={BookOpen}
            title="Sin asignaciones"
            description="Necesitas al menos una asignación para crear actividades."
          />
        </section>
      ) : activities.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={BookOpen}
            title="Sin actividades"
            description="Las actividades que crees en esta sesión aparecerán aquí."
          />
        </section>
      ) : (
        <div className="teacher-activities-list">
          {activities.map(({ activity, assignmentLabel: label }) => (
            <article className="card teacher-activity-row" key={activity.id}>
              <div className="activity-file-icon">
                <FileText />
              </div>
              <div className="teacher-activity-main">
                <div>
                  <span>{label}</span>
                  <h2>{activity.title}</h2>
                </div>
                <div className="activity-stats">
                  <span>
                    Fecha límite <strong>{formatDate(activity.dueDate)}</strong>
                  </span>
                  <span>
                    Descripción <strong>{activity.description}</strong>
                  </span>
                </div>
              </div>
              <StatusBadge tone={activity.status === "PUBLICADA" ? "success" : "neutral"}>
                {ACTIVITY_STATUS_LABELS[activity.status]}
              </StatusBadge>
              <div className="row-actions">
                {activity.status === "BORRADOR" && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => handlePublish(activity.id)}
                  >
                    <Send /> Publicar
                  </Button>
                )}
                {activity.status === "PUBLICADA" && (
                  <Link
                    className="btn btn-secondary"
                    to={`/profesor/actividades/${activity.id}/entregas`}
                  >
                    Ver entregas
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="drawer-backdrop" onMouseDown={() => setFormOpen(false)}>
          <aside
            className="form-drawer activity-form"
            aria-label="Crear actividad"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">NUEVA ACTIVIDAD</p>
                <h2>Crear actividad</h2>
                <p>Guárdala como borrador o publícala para tus estudiantes.</p>
              </div>
              <Button variant="ghost" onClick={() => setFormOpen(false)}>
                Cerrar
              </Button>
            </div>

            <form
              noValidate
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void handleCreate("BORRADOR");
              }}
            >
              {formError && (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              )}

              <FormField label="Asignatura">
                <FilterDropdown
                  label="Asignación de la actividad"
                  value={selectedId ?? ""}
                  onChange={(event) => setSelectedId(Number(event.target.value))}
                >
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignmentLabel(assignment)}
                    </option>
                  ))}
                </FilterDropdown>
              </FormField>

              <FormField label="Título">
                <input
                  required
                  type="text"
                  value={title}
                  placeholder="Ej. Taller de ecuaciones"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </FormField>

              <FormField label="Descripción e instrucciones">
                <textarea
                  required
                  rows={6}
                  value={description}
                  placeholder="Describe qué debe hacer el estudiante..."
                  onChange={(event) => setDescription(event.target.value)}
                />
              </FormField>

              <FormField label="Fecha límite">
                <input
                  required
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </FormField>

              <div className="drawer-actions">
                <Button
                  variant="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCreate("BORRADOR")}
                >
                  Guardar borrador
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCreate("PUBLICADA")}
                >
                  <Send /> Publicar actividad
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Deliveries of one activity and the grade form of the selected delivery. */
export function SubmissionsGradingPage() {
  const api = useTeacherWorkspaceApi();
  const { accessToken } = useAuthSession();
  const { activityId } = useParams();
  const numericId = Number(activityId);
  const [data, setData] = useState<ActivitySubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeacherSubmission | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken || Number.isNaN(numericId)) return;
    let active = true;

    api
      .getSubmissions(numericId, accessToken)
      .then((response) => {
        if (active) setData(response);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught, "No pudimos cargar las entregas."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, numericId]);

  const openGrading = (submission: TeacherSubmission): void => {
    setSelected(submission);
    setGrade(submission.grade === null ? "" : submission.grade.toFixed(1));
    setFeedback(submission.feedback ?? "");
    setFormError(null);
    setWriteError(null);
    setSaved(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setWriteError(null);
    setSaved(false);

    const invalid = gradeValidationError(grade);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    if (!selected || !accessToken) return;

    setBusy(true);
    try {
      const graded = await api.gradeSubmission(
        selected.id,
        {
          grade: toApiGrade(grade),
          ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
        },
        accessToken,
      );
      setData((current) =>
        current
          ? {
              ...current,
              submissions: current.submissions.map((submission) =>
                submission.id === graded.id ? graded : submission,
              ),
            }
          : current,
      );
      setSelected(graded);
      setSaved(true);
    } catch (caught) {
      setWriteError(errorMessage(caught, "No pudimos guardar la calificación."));
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
        <Link className="back-link" to="/profesor/actividades">
          <ArrowLeft /> Volver a actividades
        </Link>
        <LoadError message={loadError} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page">
      <Link className="back-link" to="/profesor/actividades">
        <ArrowLeft /> Volver a actividades
      </Link>

      <PageHeader
        eyebrow="CALIFICACIÓN DE ENTREGAS"
        title={`Entregas: ${data.activity.title}`}
        description={`Fecha límite: ${formatDate(data.activity.dueDate)}. La calificación es independiente del registro de evaluaciones.`}
      />

      <section className="card data-card">
        <div className="results-meta">
          <p>
            <strong>{data.submissions.length}</strong> entregas
          </p>
          <StatusBadge tone="warning">
            {data.submissions.filter((submission) => submission.status !== "CALIFICADA").length} por
            calificar
          </StatusBadge>
        </div>

        {data.submissions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin entregas"
            description="Los estudiantes aún no han entregado esta actividad."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Fecha de entrega</th>
                  <th>Estado</th>
                  <th>Nota</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <div className="student-cell">
                        <StudentAvatar
                          initials={initialsOf(...splitStudentName(submission.studentName))}
                        />
                        <strong>{submission.studentName}</strong>
                      </div>
                    </td>
                    <td>{formatDateTime(submission.submittedAt)}</td>
                    <td>
                      <StatusBadge tone={SUBMISSION_STATUS_TONES[submission.status]}>
                        {SUBMISSION_STATUS_LABELS[submission.status]}
                      </StatusBadge>
                    </td>
                    <td>{formatGrade(submission.grade)}</td>
                    <td>
                      <Button variant="secondary" onClick={() => openGrading(submission)}>
                        {submission.status === "CALIFICADA" ? "Revisar" : "Calificar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="drawer-backdrop" onMouseDown={() => setSelected(null)}>
          <aside
            className="form-drawer grading-drawer"
            aria-label="Calificar entrega"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="back-link"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft /> Volver a entregas
            </button>
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">ENTREGA DE ESTUDIANTE</p>
                <h2>{selected.studentName}</h2>
                <p>Enviada el {formatDateTime(selected.submittedAt)}</p>
              </div>
            </div>

            <section className="submitted-content">
              <h3>Contenido enviado</h3>
              <p>{selected.content}</p>
            </section>

            <form onSubmit={handleSubmit} noValidate>
              {formError && (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              )}
              {writeError && (
                <p className="field-error" role="alert">
                  {writeError}
                </p>
              )}

              <FormField label="Nota (0,0 a 5,0)" hint="Una sola cifra decimal.">
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                />
              </FormField>

              <FormField label="Retroalimentación">
                <textarea
                  rows={6}
                  value={feedback}
                  placeholder="Escribe comentarios claros para el estudiante..."
                  onChange={(event) => setFeedback(event.target.value)}
                />
              </FormField>

              {saved && (
                <div className="success-message" role="status">
                  <Check /> Calificación guardada correctamente.
                </div>
              )}

              <Button type="submit" disabled={busy}>
                {busy ? "Guardando…" : "Guardar calificación"}
              </Button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

/** Splits a full name from the backend into the pair expected by the avatar helper. */
function splitStudentName(fullName: string): [string, string] {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return ["", ""];
  if (parts.length === 1) return [parts[0] ?? "", ""];
  return [parts[0] ?? "", parts[parts.length - 1] ?? ""];
}
