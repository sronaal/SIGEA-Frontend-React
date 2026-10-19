import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  NotebookTabs,
  Paperclip,
  Send,
} from "lucide-react";
import { Link, useParams } from "react-router";

import { useStudentPortalApi } from "@/app/providers";
import {
  Button,
  EmptyState,
  FilterDropdown,
  FormField,
  LoadingSkeleton,
  PageHeader,
  StatCard,
  StatusBadge,
  StudentAvatar,
} from "@/components/ui";
import { useAuthSession } from "@/context/AuthSessionContext";
import { ApiError } from "@/services/http";
import type {
  AverageStatus,
  StudentActivity,
  StudentDashboard,
  StudentGrades,
  StudentProfile,
  StudentSubmission,
  StudentSubmissions,
  SubmissionPayload,
  SubmissionStatus,
} from "@/types/academic";

type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  TARJETA_IDENTIDAD: "Tarjeta de identidad",
  REGISTRO_CIVIL: "Registro civil",
  CEDULA_CIUDADANIA: "Cédula de ciudadanía",
  CEDULA_EXTRANJERIA: "Cédula de extranjería",
  PASAPORTE: "Pasaporte",
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

/** Spanish label of the average state returned by the backend. */
function averageStatusLabel(status: AverageStatus): string {
  if (status === "DEFINITIVE") return "Definitivo";
  if (status === "PROVISIONAL") return "Provisional";
  return "No disponible";
}

function submissionStatusLabel(status: SubmissionStatus): string {
  return SUBMISSION_STATUS_LABELS[status];
}

function submissionStatusTone(status: SubmissionStatus): BadgeTone {
  return SUBMISSION_STATUS_TONES[status];
}

/** Formats a single decimal grade the way the institution writes it (`4,5`). */
function formatGrade(value: number | null): string {
  return value === null ? "—" : value.toFixed(1).replace(".", ",");
}

function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

/** Parses a backend `yyyy-MM-dd` date as a local calendar date, avoiding the UTC shift. */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = parseLocalDate(value);
  return parsed ? DATE_FORMATTER.format(parsed) : "—";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : DATE_TIME_FORMATTER.format(parsed);
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback;
}

function initialsOf(nombres: string, apellidos: string): string {
  const initials = `${nombres.trim().charAt(0)}${apellidos.trim().charAt(0)}`.toUpperCase();
  return initials || "SG";
}

function gradePillClass(grade: number | null): string {
  if (grade !== null && grade >= 4) return "grade-pill grade-high";
  if (grade !== null && grade < 3) return "grade-pill grade-low";
  return "grade-pill";
}

function enrollmentLine(profile: StudentProfile): string {
  const { grade, group } = profile.enrollment;
  if (!grade) return "Sin matrícula activa";
  return group ? `${grade}° ${group}` : `${grade}°`;
}

function LoadError({ message }: { message: string }) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-icon">
        <AlertCircle />
      </div>
      <h3>No pudimos cargar la información</h3>
      <p>{message}</p>
    </div>
  );
}

/** Student landing: real metrics, next deliveries and latest grades. */
export function StudentDashboardPage() {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();
  const [data, setData] = useState<{
    profile: StudentProfile;
    dashboard: StudentDashboard;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    Promise.all([api.getMe(accessToken), api.getDashboard(accessToken)])
      .then(([profile, dashboard]) => {
        if (active) setData({ profile, dashboard });
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar tu información académica."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

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
        <PageHeader eyebrow="MI ESPACIO" title="Mi espacio" />
        <LoadError message={error} />
      </div>
    );
  }

  if (!data) return null;

  const { profile, dashboard } = data;
  const { metrics } = dashboard;
  const averageAvailable =
    metrics.averageStatus !== "UNAVAILABLE" && metrics.generalAverage !== null;
  const attendanceAvailable =
    metrics.attendanceStatus !== "UNAVAILABLE" && metrics.attendancePercentage !== null;
  const nextActivity = dashboard.nextActivities[0];
  const year = profile.enrollment.academicYear;

  return (
    <div className="page">
      <PageHeader
        eyebrow={year ? `AÑO LECTIVO ${year}` : "MI ESPACIO"}
        title={`Hola, ${profile.nombres}`}
        description={`${enrollmentLine(profile)} · Revisa lo más importante de tu semana.`}
      />

      <div className="student-summary-grid">
        <StatCard
          label="Promedio general"
          value={formatGrade(averageAvailable ? metrics.generalAverage : null)}
          hint={`Estado: ${averageStatusLabel(metrics.averageStatus)}`}
          icon={BookOpen}
          tone="mint"
        />
        <StatCard
          label="Asistencia"
          value={attendanceAvailable ? formatPercentage(metrics.attendancePercentage) : "—"}
          hint={attendanceAvailable ? "Asistencia del período" : "Asistencia no disponible"}
          icon={CheckCircle2}
          tone="blue"
        />
        <section className="card priority-card">
          <div className="priority-icon">
            {nextActivity ? <Clock3 /> : <CheckCircle2 />}
          </div>
          <div>
            <span>{nextActivity ? "PRÓXIMA ENTREGA" : "AL DÍA"}</span>
            <h2>{nextActivity ? nextActivity.title : "No tienes actividades pendientes"}</h2>
            <p>
              {nextActivity
                ? `${nextActivity.subject} · vence el ${formatDate(nextActivity.dueDate)}`
                : "No hay entregas pendientes por ahora."}
            </p>
          </div>
          {nextActivity && (
            <Link to={`/estudiante/actividades/${nextActivity.id}`}>
              Abrir actividad <ArrowRight />
            </Link>
          )}
        </section>
      </div>

      <div className="student-dashboard-grid">
        <section className="card task-panel">
          <div className="card-heading">
            <div>
              <h2>Próximas actividades</h2>
              <p>Organizadas por fecha de entrega</p>
            </div>
            <Link to="/estudiante/actividades">Ver todas</Link>
          </div>
          {dashboard.nextActivities.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin actividades próximas"
              description="Cuando se publiquen nuevas actividades aparecerán aquí."
            />
          ) : (
            dashboard.nextActivities.map((activity) => (
              <Link
                className="task-row"
                to={`/estudiante/actividades/${activity.id}`}
                key={activity.id}
              >
                <div className="task-date tone-blue">
                  <CalendarDays />
                  <span>{formatDate(activity.dueDate)}</span>
                </div>
                <div>
                  <strong>{activity.title}</strong>
                  <span>{activity.subject}</span>
                </div>
                <StatusBadge tone={submissionStatusTone(activity.status)}>
                  {submissionStatusLabel(activity.status)}
                </StatusBadge>
                <ArrowRight />
              </Link>
            ))
          )}
        </section>

        <section className="card recent-grades">
          <div className="card-heading">
            <div>
              <h2>Últimas calificaciones</h2>
              <p>Resultados publicados recientemente</p>
            </div>
            <Link to="/estudiante/calificaciones">Ver notas</Link>
          </div>
          {dashboard.recentGrades.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Sin calificaciones recientes"
              description="Tus resultados aparecerán cuando el profesor los registre."
            />
          ) : (
            dashboard.recentGrades.map((item, index) => (
              <div className="recent-grade" key={`${item.subject}-${item.assessment}-${index}`}>
                <div>
                  <strong>{item.subject}</strong>
                  <span>
                    {item.assessment} · {item.weight}%
                  </span>
                </div>
                <span className="grade-score">{formatGrade(item.grade)}</span>
              </div>
            ))
          )}
          <div className="attendance-mini">
            <div>
              <span>Actividades registradas</span>
              <strong>{metrics.submittedActivities + metrics.gradedActivities}</strong>
            </div>
            <small>
              {metrics.pendingActivities} pendientes · {metrics.gradedActivities} calificadas
            </small>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Grades of the student grouped by subject, with the real weighted average of each one. */
export function StudentGradesPage() {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();
  const [data, setData] = useState<StudentGrades | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getGrades(accessToken)
      .then((grades) => {
        if (active) setData(grades);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar tus calificaciones."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

  const filtered = useMemo(() => {
    const subjects = data?.subjects ?? [];
    return subject ? subjects.filter((item) => item.subject === subject) : subjects;
  }, [subject, data]);

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
        <PageHeader eyebrow="MIS CALIFICACIONES" title="Mis calificaciones" />
        <LoadError message={error} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="MIS CALIFICACIONES"
        title="Mis calificaciones"
        description="Consulta tus resultados por asignatura y evaluación."
      />

      <section className="grade-overview">
        <div>
          <span>Promedio general</span>
          <strong>{formatGrade(data.generalAverage)}</strong>
          <small>{averageStatusLabel(data.averageStatus)}</small>
        </div>
        {data.subjects.map((item) => (
          <span key={item.subject}>
            {item.subject} {formatGrade(item.average)}
          </span>
        ))}
      </section>

      <div className="table-toolbar">
        <div className="filter-group">
          <FilterDropdown
            label="Asignatura"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          >
            <option value="">Todas las asignaturas</option>
            {data.subjects.map((item) => (
              <option key={item.subject} value={item.subject}>
                {item.subject}
              </option>
            ))}
          </FilterDropdown>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={GraduationCap}
            title="Sin calificaciones"
            description={
              data.subjects.length === 0
                ? "Aún no hay evaluaciones calificadas en tu matrícula."
                : "No hay calificaciones para la asignatura seleccionada."
            }
          />
        </section>
      ) : (
        filtered.map((item) => (
          <section className="card data-card" key={item.subject}>
            <div className="table-toolbar">
              <div>
                <h2>{item.subject}</h2>
                <p>
                  Promedio {formatGrade(item.average)} · {averageStatusLabel(item.averageStatus)}
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Evaluación</th>
                    <th>Ponderación</th>
                    <th>Período</th>
                    <th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {item.grades.map((grade) => (
                    <tr key={grade.assessmentId}>
                      <td>{grade.assessment}</td>
                      <td>{grade.weight}%</td>
                      <td>{grade.period}</td>
                      <td>
                        {grade.grade === null ? (
                          <StatusBadge tone="neutral">Pendiente</StatusBadge>
                        ) : (
                          <span className={gradePillClass(grade.grade)}>
                            {formatGrade(grade.grade)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/** Published activities of the student with the state derived from the delivery. */
export function StudentActivitiesPage() {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();
  const [activities, setActivities] = useState<StudentActivity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getActivities(accessToken)
      .then((response) => {
        if (active) setActivities(response.activities);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar tus actividades."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

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
        <PageHeader eyebrow="TRABAJO ACADÉMICO" title="Mis actividades" />
        <LoadError message={error} />
      </div>
    );
  }

  if (!activities) return null;

  const filtered = status
    ? activities.filter((activity) => activity.status === status)
    : activities;

  return (
    <div className="page">
      <PageHeader
        eyebrow="TRABAJO ACADÉMICO"
        title="Mis actividades"
        description="Revisa instrucciones, fechas y el estado de cada entrega."
      />

      <div className="activity-toolbar">
        <FilterDropdown
          label="Estado"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="ENTREGADA">Entregada</option>
          <option value="CALIFICADA">Calificada</option>
        </FilterDropdown>
        <span>{filtered.length} actividades</span>
      </div>

      {filtered.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={NotebookTabs}
            title="Sin actividades"
            description={
              activities.length === 0
                ? "Cuando tus profesores publiquen actividades aparecerán aquí."
                : "No hay actividades con el estado seleccionado."
            }
          />
        </section>
      ) : (
        <div className="activities-grid">
          {filtered.map((activity) => (
            <article className="card activity-card" key={activity.id}>
              <div className="activity-card-top">
                <span className="subject-label">{activity.subject}</span>
                <StatusBadge tone={submissionStatusTone(activity.status)}>
                  {submissionStatusLabel(activity.status)}
                </StatusBadge>
              </div>
              <h2>{activity.title}</h2>
              <p>{activity.description}</p>
              <div className="activity-meta">
                <span>
                  <CalendarDays /> Vence el {formatDate(activity.dueDate)}
                </span>
                {activity.grade !== null && (
                  <span>
                    <BookOpen /> Nota {formatGrade(activity.grade)}
                  </span>
                )}
              </div>
              <Link className="btn btn-secondary" to={`/estudiante/actividades/${activity.id}`}>
                Ver actividad <ArrowRight />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** Instructions of a published activity and the single delivery form. */
export function ActivityDetailPage() {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();
  const { activityId } = useParams();
  const numericId = Number(activityId);
  const [activities, setActivities] = useState<StudentActivity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<StudentSubmission | null>(null);
  const [contenido, setContenido] = useState("");
  const [archivoRef, setArchivoRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getActivities(accessToken)
      .then((response) => {
        if (active) setActivities(response.activities);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught, "No pudimos cargar la actividad."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

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
        <Link className="back-link" to="/estudiante/actividades">
          <ArrowLeft /> Volver a mis actividades
        </Link>
        <LoadError message={loadError} />
      </div>
    );
  }

  const activity = activities?.find((item) => item.id === numericId) ?? null;

  if (!activity) {
    return (
      <div className="page">
        <Link className="back-link" to="/estudiante/actividades">
          <ArrowLeft /> Volver a mis actividades
        </Link>
        <section className="card">
          <EmptyState
            icon={NotebookTabs}
            title="Actividad no encontrada"
            description="La actividad no existe o no hace parte de tus asignaturas."
          />
        </section>
      </div>
    );
  }

  const delivered = submitted ?? null;
  const status = delivered?.status ?? activity.status;
  const grade = delivered?.grade ?? activity.grade;
  const feedback = delivered?.feedback ?? activity.feedback;
  const canSubmit = activity.status === "PENDIENTE" && delivered === null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitError(null);

    const content = contenido.trim();
    const fileRef = archivoRef.trim();

    if (!content && !fileRef) {
      setSubmitError("Escribe una respuesta o indica un archivo de referencia.");
      return;
    }
    if (!accessToken) return;

    const payload: SubmissionPayload = {
      ...(content ? { contenido: content } : {}),
      ...(fileRef ? { archivoRef: fileRef } : {}),
    };

    setBusy(true);
    try {
      const submission = await api.submitActivity(activity.id, payload, accessToken);
      setSubmitted(submission);
      setContenido("");
      setArchivoRef("");
    } catch (caught) {
      setSubmitError(
        errorMessage(caught, "No pudimos registrar tu entrega. Intenta de nuevo."),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Link className="back-link" to="/estudiante/actividades">
        <ArrowLeft /> Volver a mis actividades
      </Link>

      <div className="activity-detail-grid">
        <section className="card activity-instructions">
          <div className="activity-card-top">
            <span className="subject-label">{activity.subject}</span>
            <StatusBadge tone={submissionStatusTone(status)}>
              {submissionStatusLabel(status)}
            </StatusBadge>
          </div>
          <h1>{activity.title}</h1>
          <p className="activity-byline">Fecha límite: {formatDate(activity.dueDate)}</p>
          <div className="instruction-block">
            <h2>Instrucciones</h2>
            <p>{activity.description}</p>
            {grade !== null && (
              <p>
                <strong>Nota registrada:</strong> {formatGrade(grade)}
              </p>
            )}
            {feedback && (
              <blockquote>
                <strong>Retroalimentación:</strong> {feedback}
              </blockquote>
            )}
          </div>
        </section>

        <aside className="card submission-panel">
          <h2>Tu entrega</h2>

          {canSubmit ? (
            <form onSubmit={handleSubmit} noValidate>
              {submitError && (
                <p className="field-error" role="alert">
                  {submitError}
                </p>
              )}

              <FormField
                label="Respuesta"
                hint="Explica brevemente tu trabajo o agrega comentarios para el profesor."
              >
                <textarea
                  rows={6}
                  value={contenido}
                  placeholder="Escribe tu respuesta aquí…"
                  onChange={(event) => setContenido(event.target.value)}
                />
              </FormField>

              <FormField
                label="Archivo de referencia (opcional)"
                hint="Nombre o referencia del archivo que entregas."
              >
                <div className="input-with-icon">
                  <Paperclip />
                  <input
                    type="text"
                    value={archivoRef}
                    placeholder="informe.pdf"
                    onChange={(event) => setArchivoRef(event.target.value)}
                  />
                </div>
              </FormField>

              <Button type="submit" disabled={busy}>
                {busy ? "Enviando…" : "Enviar entrega"} <Send />
              </Button>
            </form>
          ) : delivered !== null || activity.status !== "PENDIENTE" ? (
            <div className="submitted-state">
              <CheckCircle2 />
              <strong>
                {status === "CALIFICADA" ? "Actividad calificada" : "Actividad entregada"}
              </strong>
              <p>
                {delivered
                  ? `Entrega registrada el ${formatDateTime(delivered.submittedAt)}.`
                  : "Tu respuesta quedó registrada en el sistema."}
              </p>
              <div>
                <span>Estado</span>
                <StatusBadge tone={submissionStatusTone(status)}>
                  {submissionStatusLabel(status)}
                </StatusBadge>
              </div>
              {grade !== null && (
                <div>
                  <span>Calificación</span>
                  <span className={gradePillClass(grade)}>{formatGrade(grade)}</span>
                </div>
              )}
              {feedback && <blockquote>“{feedback}”</blockquote>}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** Delivery history of the student with the feedback of the teacher. */
export function StudentSubmissionsPage() {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();
  const [data, setData] = useState<StudentSubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getSubmissions(accessToken)
      .then((submissions) => {
        if (active) setData(submissions);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar tus entregas."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

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
        <PageHeader eyebrow="HISTORIAL PERSONAL" title="Mis entregas" />
        <LoadError message={error} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="HISTORIAL PERSONAL"
        title="Mis entregas"
        description="Consulta tus trabajos enviados y la retroalimentación disponible."
      />

      <section className="card data-card">
        {data.submissions.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="Sin entregas registradas"
            description="Cuando entregues una actividad aparecerá en este historial."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>Asignatura</th>
                  <th>Fecha de entrega</th>
                  <th>Estado</th>
                  <th>Calificación</th>
                  <th>Retroalimentación</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      <Link
                        className="table-link"
                        to={`/estudiante/actividades/${submission.activityId}`}
                      >
                        {submission.title}
                      </Link>
                    </td>
                    <td>{submission.subject}</td>
                    <td>{formatDateTime(submission.submittedAt)}</td>
                    <td>
                      <StatusBadge tone={submissionStatusTone(submission.status)}>
                        {submissionStatusLabel(submission.status)}
                      </StatusBadge>
                    </td>
                    <td>
                      {submission.grade === null ? (
                        <span>—</span>
                      ) : (
                        <span className={gradePillClass(submission.grade)}>
                          {formatGrade(submission.grade)}
                        </span>
                      )}
                    </td>
                    <td className="observation-cell">
                      {submission.feedback || "Sin observaciones"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Identity and active enrollment of the student. */
export function StudentProfilePage() {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getMe(accessToken)
      .then((response) => {
        if (active) setProfile(response);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar tu perfil."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

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
        <PageHeader eyebrow="INFORMACIÓN PERSONAL" title="Mi perfil" />
        <LoadError message={error} />
      </div>
    );
  }

  if (!profile) return null;

  const documentType = DOCUMENT_TYPE_LABELS[profile.tipoDocumento] ?? profile.tipoDocumento;
  const { enrollment } = profile;
  const hasEnrollment = enrollment.academicYear !== null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="INFORMACIÓN PERSONAL"
        title="Mi perfil"
        description="Información académica registrada por tu institución."
      />

      <section className="card profile-card">
        <div className="profile-identity">
          <StudentAvatar
            initials={initialsOf(profile.nombres, profile.apellidos)}
            size="large"
          />
          <div>
            <h2>
              {profile.nombres} {profile.apellidos}
            </h2>
            <p>{hasEnrollment ? `Estudiante · ${enrollmentLine(profile)}` : "Sin matrícula activa"}</p>
          </div>
        </div>

        <dl>
          <div>
            <dt>Documento</dt>
            <dd>
              {documentType} · {profile.numeroDocumento}
            </dd>
          </div>
          <div>
            <dt>Correo institucional</dt>
            <dd>{profile.correoInstitucional}</dd>
          </div>
          <div>
            <dt>Año lectivo</dt>
            <dd>{enrollment.academicYear ?? "—"}</dd>
          </div>
          <div>
            <dt>Grado</dt>
            <dd>{enrollment.grade ? `${enrollment.grade}°` : "—"}</dd>
          </div>
          <div>
            <dt>Grupo</dt>
            <dd>{enrollment.group ?? "—"}</dd>
          </div>
          <div>
            <dt>Período</dt>
            <dd>{enrollment.period ?? "—"}</dd>
          </div>
          <div>
            <dt>Matrícula</dt>
            <dd>{hasEnrollment ? "Activa" : "Sin matrícula activa"}</dd>
          </div>
        </dl>

        <p className="profile-note">
          Para corregir esta información, comunícate con la secretaría académica.
        </p>
      </section>
    </div>
  );
}
