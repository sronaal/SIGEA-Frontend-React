/**
 * Mirror of the frozen backend contract of the guardian-access capability.
 *
 * Source of truth (backend, Spring Boot):
 *   com.sigea.guardianaccess.dto.OtpRequestPayload / OtpRequestResponse
 *   com.sigea.guardianaccess.dto.OtpVerifyPayload  / OtpVerifyResponse
 *   com.sigea.guardianaccess.dto.GuardianProfileResponse (+ nested views)
 *   com.sigea.guardianaccess.dto.AverageStatus / AttendanceStatus / SubmissionStatus
 *   com.sigea.students.DocumentType
 *
 * Every optional figure is modelled as `T | null`: the backend reports a missing metric as
 * `null` plus an `UNAVAILABLE` status instead of inventing a value.
 */

/** Identity document types persisted as the enum name (VARCHAR(20) column). */
export type DocumentType = "TARJETA_IDENTIDAD" | "REGISTRO_CIVIL" | "CEDULA_CIUDADANIA";

/** Availability of the weighted general average. */
export type AverageStatus = "PROVISIONAL" | "DEFINITIVE" | "UNAVAILABLE";

/** Availability of the attendance percentage (distinct from the per-session attendance state). */
export type AttendanceStatus = "AVAILABLE" | "UNAVAILABLE";

/** Derived delivery state of an activity. */
export type SubmissionStatus = "PENDIENTE" | "ENTREGADA" | "CALIFICADA";

/** Body of `POST /api/v1/guardian-access/request`. */
export interface OtpRequestPayload {
  tipoDocumento: DocumentType;
  numeroDocumento: string;
}

/** Body of the 202 answer of `POST /api/v1/guardian-access/request`. */
export interface OtpRequestResponse {
  message: string;
}

/** Body of `POST /api/v1/guardian-access/verify`. */
export interface OtpVerifyPayload {
  tipoDocumento: DocumentType;
  numeroDocumento: string;
  codigo: string;
}

/** Body of the 200 answer of `POST /api/v1/guardian-access/verify`. */
export interface OtpVerifyResponse {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt: string;
}

export interface StudentView {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
}

export interface EnrollmentView {
  academicYear: number | null;
  grade: string | null;
  group: string | null;
  period: number | null;
}

export interface MetricsView {
  generalAverage: number | null;
  averageStatus: AverageStatus;
  attendancePercentage: number | null;
  attendanceStatus: AttendanceStatus;
}

export interface ActivityView {
  subject: string;
  title: string;
  dueDate: string;
  status: SubmissionStatus;
}

export interface SessionView {
  expiresAt: string;
}

/** Body of `GET /api/v1/guardian-access/profile`. */
export interface GuardianProfile {
  student: StudentView;
  enrollment: EnrollmentView;
  metrics: MetricsView;
  activities: ActivityView[];
  session: SessionView;
}

/** Canonical error payload of the backend: `{timestamp, status, error, message, path}`. */
export interface ApiErrorPayload {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
