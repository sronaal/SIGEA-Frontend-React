import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  FolderOpen,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { useTeacherWorkspaceApi } from "@/app/providers";
import { ActivityTypeBadge, ACTIVITY_TYPE_LABELS } from "@/components/ActivityTypeBadge";
import { formatFileSize } from "@/components/FileBoard";
import { LoadError } from "@/components/feedback";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
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
import { ActivityMaterialsPanel } from "@/features/teacher/ActivityMaterialsPanel";
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
  ActivityType,
  SubmissionStatus,
  TeacherActivity,
  TeacherAssignment,
  TeacherStudent,
  TeacherSubmission,
} from "@/types/academic";
import type { FileMetadata } from "@/types/files";

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
                      <caption className="sr-only">Estudiantes de la asignación</caption>
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
                            <td data-label="Estudiante">
                              <div className="student-cell">
                                <StudentAvatar
                                  initials={initialsOf(student.nombres, student.apellidos)}
                                />
                                <strong>
                                  {student.nombres} {student.apellidos}
                                </strong>
                              </div>
                            </td>
                            <td data-label="Documento">{student.numeroDocumento}</td>
                            <td data-label="Promedio">{formatGrade(student.average)}</td>
                            <td data-label="Asistencia">{formatPercentage(student.attendancePercentage)}</td>
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
  const [activities, setActivities] = useState<TeacherActivity[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState<ActivityType>("TAREA");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "">("");
  const [materialsFor, setMaterialsFor] = useState<TeacherActivity | null>(null);
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

  useEffect(() => {
    if (!accessToken || selectedId === null) return;
    let active = true;

    setLoadingActivities(true);
    setActivitiesError(null);
    setActivities(null);

    api
      .getActivities(selectedId, accessToken, typeFilter || undefined)
      .then((response) => {
        if (active) setActivities(response.activities);
      })
      .catch((caught) => {
        if (active)
          setActivitiesError(errorMessage(caught, "No pudimos cargar las actividades de la asignación."));
      })
      .finally(() => {
        if (active) setLoadingActivities(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, selectedId, typeFilter]);

  const selectedAssignment = useMemo(
    () => assignments.find((item) => item.id === selectedId) ?? null,
    [assignments, selectedId],
  );

  const refreshActivities = async (assignmentId: number, token: string): Promise<void> => {
    const response = await api.getActivities(assignmentId, token, typeFilter || undefined);
    setActivities(response.activities);
    setActivitiesError(null);
  };

  const resetForm = (): void => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setType("TAREA");
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
    if (!accessToken) return;

    setBusy(true);
    try {
      await api.createActivity(
        selectedId,
        {
          title: title.trim(),
          description: description.trim(),
          dueDate,
          status,
          type,
        },
        accessToken,
      );
      setFormOpen(false);
      resetForm();
      setMessage(
        status === "PUBLICADA"
          ? "Actividad publicada correctamente."
          : "Actividad guardada como borrador.",
      );
      try {
        await refreshActivities(selectedId, accessToken);
      } catch (caught) {
        setWriteError(
          errorMessage(caught, "La actividad se guardó, pero no pudimos actualizar el listado."),
        );
      }
    } catch (caught) {
      setFormError(errorMessage(caught, "No pudimos crear la actividad. Intenta de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async (activityId: number): Promise<void> => {
    setWriteError(null);
    setMessage(null);
    if (!accessToken || selectedId === null) return;

    setBusy(true);
    try {
      await api.publishActivity(activityId, accessToken);
      await refreshActivities(selectedId, accessToken);
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

      {assignments.length > 0 && !activitiesError && !loadingActivities && activities !== null && (
        <div className="results-meta">
          <p>
            <strong>{activities.length}</strong> actividades
          </p>
          <FilterDropdown
            label="Filtrar las actividades por tipo"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ActivityType | "")}
          >
            <option value="">Todos los tipos</option>
            <option value="TAREA">{ACTIVITY_TYPE_LABELS.TAREA}</option>
            <option value="ACTIVIDAD">{ACTIVITY_TYPE_LABELS.ACTIVIDAD}</option>
            <option value="TALLER">{ACTIVITY_TYPE_LABELS.TALLER}</option>
            <option value="PROYECTO">{ACTIVITY_TYPE_LABELS.PROYECTO}</option>
          </FilterDropdown>
        </div>
      )}

      {assignments.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={BookOpen}
            title="Sin asignaciones"
            description="Necesitas al menos una asignación para crear actividades."
          />
        </section>
      ) : activitiesError ? (
        <LoadError message={activitiesError} />
      ) : loadingActivities || activities === null ? (
        <section className="card">
          <LoadingSkeleton />
        </section>
      ) : activities.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={BookOpen}
            title="Sin actividades"
            description={
              typeFilter
                ? "No hay actividades de este tipo en esta asignación."
                : "La asignación no tiene actividades registradas."
            }
          />
        </section>
      ) : (
        <div className="teacher-activities-list">
          {activities.map((activity) => (
            <article className="card teacher-activity-row" key={activity.id}>
              <div className="activity-file-icon">
                <FileText />
              </div>
              <div className="teacher-activity-main">
                <div>
                  <span>{selectedAssignment ? assignmentLabel(selectedAssignment) : "—"}</span>
                  <h2>{activity.title}</h2>
                  <ActivityTypeBadge type={activity.type} />
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
                <Button variant="secondary" onClick={() => setMaterialsFor(activity)}>
                  <FolderOpen /> Materiales
                </Button>
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

              <FormField label="Tipo de actividad">
                <FilterDropdown
                  label="Tipo de la actividad"
                  value={type}
                  onChange={(event) => setType(event.target.value as ActivityType)}
                >
                  <option value="TAREA">
                    {ACTIVITY_TYPE_LABELS.TAREA} — se realiza en casa
                  </option>
                  <option value="ACTIVIDAD">
                    {ACTIVITY_TYPE_LABELS.ACTIVIDAD} — se realiza en clase
                  </option>
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

      {materialsFor && (
        <ActivityMaterialsPanel
          activityId={materialsFor.id}
          activityTitle={materialsFor.title}
          onClose={() => setMaterialsFor(null)}
        />
      )}
    </div>
  );
}

/**
 * Grading session of one activity: the deliveries on the left, the detail with its attachments and
 * the grade form on the right. Every enrolled student appears, including those without a delivery
 * (`PENDIENTE`), and "Guardar y siguiente" walks the list without leaving the screen.
 */
export function SubmissionsGradingPage() {
  const api = useTeacherWorkspaceApi();
  const { accessToken } = useAuthSession();
  const { activityId } = useParams();
  const numericId = Number(activityId);
  const [data, setData] = useState<ActivitySubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "">("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

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

  const visible = useMemo(
    () =>
      (data?.submissions ?? []).filter(
        (submission) => statusFilter === "" || submission.status === statusFilter,
      ),
    [data, statusFilter],
  );

  const selected = useMemo(() => {
    if (visible.length === 0) return null;
    return visible.find((submission) => submission.studentId === selectedId) ?? visible[0] ?? null;
  }, [visible, selectedId]);

  const gradedCount =
    data?.submissions.filter((submission) => submission.status === "CALIFICADA").length ?? 0;

  /** Selects a delivery and mirrors its current grade and feedback into the form. */
  const applySelection = (submission: TeacherSubmission): void => {
    setSelectedId(submission.studentId);
    setGrade(submission.grade === null ? "" : submission.grade.toFixed(1));
    setFeedback(submission.feedback ?? "");
    setFormError(null);
    setWriteError(null);
    setSaved(false);
  };

  // The first delivery of the (filtered) list opens by default, and a filter that hides the
  // current selection falls back to the first visible row.
  useEffect(() => {
    if (selected !== null && selected.studentId !== selectedId) {
      applySelection(selected);
    }
    // applySelection is a stable closure over state setters; the list is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const saveGrade = async (andNext: boolean): Promise<void> => {
    setFormError(null);
    setWriteError(null);
    setSaved(false);

    const invalid = gradeValidationError(grade);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    if (!selected || selected.id === null || !accessToken) return;

    const index = visible.findIndex((submission) => submission.studentId === selected.studentId);
    const next = index >= 0 ? (visible[index + 1] ?? null) : null;

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
      if (andNext && next) {
        applySelection(next);
      } else {
        setSaved(true);
      }
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

      <div className="grading-toolbar">
        <div className="grading-toolbar-badges">
          <ActivityTypeBadge type={data.activity.type} />
          <StatusBadge tone={gradedCount === data.submissions.length ? "success" : "warning"}>
            {gradedCount} de {data.submissions.length} calificadas
          </StatusBadge>
        </div>
        <FilterDropdown
          label="Filtrar las entregas por estado"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as SubmissionStatus | "")}
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">{SUBMISSION_STATUS_LABELS.PENDIENTE}</option>
          <option value="ENTREGADA">{SUBMISSION_STATUS_LABELS.ENTREGADA}</option>
          <option value="CALIFICADA">{SUBMISSION_STATUS_LABELS.CALIFICADA}</option>
        </FilterDropdown>
      </div>

      {data.submissions.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={FileText}
            title="Sin entregas"
            description="Los estudiantes aún no han entregado esta actividad."
          />
        </section>
      ) : (
        <div className="grading-split">
          <aside className="card grading-list" aria-label="Lista de entregas">
            {visible.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Sin entregas"
                description="No hay entregas con ese estado."
              />
            ) : (
              visible.map((submission) => (
                <button
                  type="button"
                  key={submission.studentId}
                  className={`grading-list-item${selected?.studentId === submission.studentId ? " is-active" : ""}`}
                  aria-label={
                    submission.status === "PENDIENTE"
                      ? `Ver entrega de ${submission.studentName}`
                      : `Calificar a ${submission.studentName}`
                  }
                  onClick={() => applySelection(submission)}
                >
                  <StudentAvatar
                    initials={initialsOf(...splitStudentName(submission.studentName))}
                  />
                  <span className="grading-list-text">
                    <strong>{submission.studentName}</strong>
                    <small>
                      {submission.submittedAt
                        ? formatDateTime(submission.submittedAt)
                        : "Sin entrega"}
                    </small>
                  </span>
                  <StatusBadge tone={SUBMISSION_STATUS_TONES[submission.status]}>
                    {SUBMISSION_STATUS_LABELS[submission.status]}
                  </StatusBadge>
                </button>
              ))
            )}
          </aside>

          <section className="card grading-detail" aria-label="Detalle de la entrega">
            {selected === null ? (
              <EmptyState
                icon={FileText}
                title="Selecciona una entrega"
                description="Elige un estudiante de la lista para calificar."
              />
            ) : (
              <>
                <div className="grading-detail-heading">
                  <div className="student-cell">
                    <StudentAvatar
                      initials={initialsOf(...splitStudentName(selected.studentName))}
                    />
                    <div>
                      <h2>{selected.studentName}</h2>
                      <p>
                        {selected.submittedAt
                          ? `Enviada el ${formatDateTime(selected.submittedAt)}`
                          : "Sin entrega"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone={SUBMISSION_STATUS_TONES[selected.status]}>
                    {SUBMISSION_STATUS_LABELS[selected.status]}
                  </StatusBadge>
                </div>

                {selected.status === "CALIFICADA" && (
                  <div className="grading-audit" role="note">
                    <p>
                      Calificada el <strong>{formatDateTime(selected.gradedAt)}</strong>
                    </p>
                    <p>
                      Por <strong>{selected.gradedByName ?? "—"}</strong>
                    </p>
                    <p>
                      Nota <strong>{formatGrade(selected.grade)}</strong>
                    </p>
                  </div>
                )}

                {selected.status === "PENDIENTE" ? (
                  <EmptyState
                    icon={FileText}
                    title="Sin entrega"
                    description="Este estudiante aún no ha entregado la actividad."
                  />
                ) : (
                  <>
                    <section className="submitted-content">
                      <h3>Contenido enviado</h3>
                      <p>{selected.content}</p>
                    </section>

                    <section className="grading-files">
                      <h3>Adjuntos ({selected.files.length})</h3>
                      {selected.files.length === 0 ? (
                        <p className="muted">Sin archivos adjuntos.</p>
                      ) : (
                        <ul className="materials-list">
                          {selected.files.map((file) => (
                            <li key={file.id} className="materials-list-item">
                              <FileText aria-hidden />
                              <div>
                                <strong>{file.nombreOriginal}</strong>
                                <small>{formatFileSize(file.tamanoBytes)}</small>
                              </div>
                              <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setPreviewFile(file)}
                              >
                                <Eye aria-hidden /> Ver
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <form
                      noValidate
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        void saveGrade(false);
                      }}
                    >
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

                      <div className="drawer-actions">
                        <Button type="submit" disabled={busy}>
                          {busy ? "Guardando…" : "Guardar calificación"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void saveGrade(true)}
                        >
                          Guardar y siguiente
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}

      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
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
