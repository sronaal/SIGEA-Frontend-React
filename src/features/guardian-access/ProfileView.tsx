import { GraduationCap, LogOut } from "lucide-react";

import { Button, StatusBadge } from "@/components/ui";
import {
  attendanceStatusLabel,
  averageStatusLabel,
  documentTypeLabel,
  enrollmentSummary,
  formatAverage,
  formatDateTime,
  formatLocalDate,
  formatPercentage,
  submissionStatusLabel,
} from "@/features/guardian-access/labels";
import type { GuardianProfile, SubmissionStatus } from "@/types/guardian";

export interface ProfileViewProps {
  /** Frozen profile returned by `GET /api/v1/guardian-access/profile`. */
  profile: GuardianProfile;
  /** Called when the guardian closes the consultation. */
  onClose: () => void;
}

function activityTone(status: SubmissionStatus): "success" | "warning" | "info" {
  switch (status) {
    case "CALIFICADA":
      return "success";
    case "ENTREGADA":
      return "info";
    case "PENDIENTE":
      return "warning";
  }
}

/**
 * Step 3 of the guardian flow: the read-only academic profile. Every figure comes from the API;
 * when the backend reports a metric as unavailable, the UI says so instead of showing a number.
 * There are no write controls: the only action is closing the consultation.
 */
export default function ProfileView({ profile, onClose }: ProfileViewProps) {
  const { student, enrollment, metrics, activities, session } = profile;

  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
  const enrollmentLine = enrollmentSummary(enrollment);

  const hasAverage = metrics.generalAverage !== null && metrics.averageStatus !== "UNAVAILABLE";
  const hasAttendance = metrics.attendancePercentage !== null && metrics.attendanceStatus === "AVAILABLE";

  const pendingActivities = activities.filter((activity) => activity.status === "PENDIENTE").length;

  return (
    <div className="parent-profile-page">
      <header className="parent-header">
        <div className="portal-brand">
          <div className="brand-mark">
            <GraduationCap />
          </div>
          <div>
            <strong>SIGEA Familias</strong>
            <span>Consulta temporal · solo lectura</span>
          </div>
        </div>
        <Button variant="secondary" onClick={onClose}>
          <LogOut />
          Cerrar consulta
        </Button>
      </header>
      <main className="parent-content">
        <div className="demo-notice" role="note">
          <span>Solo lectura</span> Esta consulta no permite modificar información del estudiante. La sesión expira
          automáticamente el {formatDateTime(session.expiresAt)}.
        </div>

        <div className="parent-student-head">
          <div className="avatar avatar-large">{initials}</div>
          <div>
            <p className="eyebrow">PERFIL ACADÉMICO AUTORIZADO</p>
            <h1>
              {student.firstName} {student.lastName}
            </h1>
            <p>{enrollmentLine ?? "Sin matrícula activa en el periodo consultado"}</p>
          </div>
          <StatusBadge tone="info">{documentTypeLabel(student.documentType)}</StatusBadge>
        </div>

        <div className="parent-metrics">
          <div className="tone-mint">
            <span>Promedio general</span>
            <strong className={hasAverage ? undefined : "metric-unavailable"}>
              {hasAverage && metrics.generalAverage !== null ? formatAverage(metrics.generalAverage) : "No disponible"}
            </strong>
            <small>{averageStatusLabel(metrics.averageStatus)}</small>
          </div>
          <div className="tone-blue">
            <span>Asistencia</span>
            <strong className={hasAttendance ? undefined : "metric-unavailable"}>
              {hasAttendance && metrics.attendancePercentage !== null
                ? formatPercentage(metrics.attendancePercentage)
                : "No disponible"}
            </strong>
            <small>{attendanceStatusLabel(metrics.attendanceStatus)}</small>
          </div>
          <div className="tone-yellow">
            <span>Actividades pendientes</span>
            <strong>{pendingActivities}</strong>
            <small>
              {activities.length === 0 ? "Sin actividades publicadas" : `de ${activities.length} publicadas`}
            </small>
          </div>
        </div>

        <div className="parent-grid">
          <section className="card parent-section">
            <h2>Datos del estudiante</h2>
            <div className="parent-row">
              <span>Tipo de documento</span>
              <strong>{documentTypeLabel(student.documentType)}</strong>
            </div>
            <div className="parent-row">
              <span>Número de documento</span>
              <strong>{student.documentNumber}</strong>
            </div>
            <div className="parent-row">
              <span>Año académico</span>
              <strong>{enrollment.academicYear ?? "No disponible"}</strong>
            </div>
            <div className="parent-row">
              <span>Grado</span>
              <strong>{enrollment.grade ?? "No disponible"}</strong>
            </div>
            <div className="parent-row">
              <span>Grupo</span>
              <strong>{enrollment.group ?? "No disponible"}</strong>
            </div>
            <div className="parent-row">
              <span>Periodo</span>
              <strong>{enrollment.period ?? "No disponible"}</strong>
            </div>
          </section>

          <section className="card parent-section">
            <h2>Actividades</h2>
            {activities.length === 0 ? (
              <p className="parent-empty">No hay actividades publicadas para el grupo consultado.</p>
            ) : (
              activities.map((activity, index) => (
                <div
                  className="parent-row"
                  key={`${activity.subject}-${activity.title}-${activity.dueDate}-${index}`}
                >
                  <div>
                    <strong>{activity.title}</strong>
                    <span>
                      {activity.subject} · Entrega {formatLocalDate(activity.dueDate)}
                    </span>
                  </div>
                  <StatusBadge tone={activityTone(activity.status)}>
                    {submissionStatusLabel(activity.status)}
                  </StatusBadge>
                </div>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
