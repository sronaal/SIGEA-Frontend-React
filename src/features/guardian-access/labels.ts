import { ApiError } from "@/services/http";
import type {
  AverageStatus,
  AttendanceStatus,
  DocumentType,
  EnrollmentView,
  SubmissionStatus,
} from "@/types/guardian";

/** Document types offered by the portal, in the order of the prototype. */
export const DOCUMENT_TYPE_OPTIONS: ReadonlyArray<{ value: DocumentType; label: string }> = [
  { value: "TARJETA_IDENTIDAD", label: "Tarjeta de identidad" },
  { value: "REGISTRO_CIVIL", label: "Registro civil" },
  { value: "CEDULA_CIUDADANIA", label: "Cédula de ciudadanía" },
];

/** Human readable label of a document type. */
export function documentTypeLabel(value: DocumentType | string): string {
  const known = DOCUMENT_TYPE_OPTIONS.find((option) => option.value === value);
  return known ? known.label : value;
}

/** Human readable label of the general average status. */
export function averageStatusLabel(status: AverageStatus): string {
  switch (status) {
    case "DEFINITIVE":
      return "Definitivo";
    case "PROVISIONAL":
      return "Provisional";
    case "UNAVAILABLE":
      return "No disponible";
  }
}

/** Human readable label of the attendance status. */
export function attendanceStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";
    case "UNAVAILABLE":
      return "No disponible";
  }
}

/** Human readable label of the delivery state of an activity. */
export function submissionStatusLabel(status: SubmissionStatus): string {
  switch (status) {
    case "PENDIENTE":
      return "Pendiente";
    case "ENTREGADA":
      return "Entregada";
    case "CALIFICADA":
      return "Calificada";
  }
}

/** Short Spanish month names, kept explicit so the rendering never depends on the ICU data. */
const MONTH_NAMES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Formats a general average with exactly one decimal, using the Colombian convention. */
export function formatAverage(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** Formats an attendance percentage. */
export function formatPercentage(value: number): string {
  return `${value}%`;
}

/**
 * Formats an ISO local date (`2026-05-22`) without shifting the day across time zones: the parts
 * are read as plain calendar values instead of a UTC timestamp.
 */
export function formatLocalDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) return isoDate;
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** Formats an ISO instant (session expiration) for humans, in the local time zone. */
export function formatDateTime(isoInstant: string): string {
  const parsed = new Date(isoInstant);
  if (Number.isNaN(parsed.getTime())) return isoInstant;
  const month = MONTH_NAMES[parsed.getMonth()] ?? "";
  return `${parsed.getDate()} ${month} ${parsed.getFullYear()}, ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

/** One line summary of the enrollment, or `null` when the student has no active enrollment. */
export function enrollmentSummary(enrollment: EnrollmentView): string | null {
  const parts: string[] = [];
  if (enrollment.grade !== null && enrollment.group !== null) {
    parts.push(`${enrollment.grade}° ${enrollment.group}`);
  } else if (enrollment.grade !== null) {
    parts.push(`${enrollment.grade}°`);
  }
  if (enrollment.period !== null) {
    parts.push(`Periodo ${enrollment.period}`);
  }
  if (enrollment.academicYear !== null) {
    parts.push(String(enrollment.academicYear));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Message shown when the one-time code request could not be completed. */
export function describeRequestError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isValidation) return "Revisa los datos ingresados e inténtalo de nuevo.";
    if (error.isNetworkError) return "No pudimos conectar con el sistema. Inténtalo de nuevo.";
  }
  return "No pudimos solicitar el código de verificación. Inténtalo de nuevo.";
}

/** Message shown when the one-time code could not be validated. */
export function describeVerifyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isTooManyAttempts) {
      return "Superaste el número de intentos permitidos. Solicita un código nuevo para continuar.";
    }
    if (error.isUnauthorized) {
      return "El código no es válido, expiró o ya fue utilizado. Solicita uno nuevo.";
    }
    if (error.isValidation) return "Revisa los datos ingresados e inténtalo de nuevo.";
    if (error.isNetworkError) return "No pudimos conectar con el sistema. Inténtalo de nuevo.";
  }
  return "No pudimos validar el código. Inténtalo de nuevo.";
}

/** Message shown when the academic profile could not be read. */
export function describeProfileError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) {
      return "Tu sesión de consulta expiró. Inicia una nueva consulta para continuar.";
    }
    if (error.isForbidden) {
      return "El acceso a este estudiante ya no está autorizado. Inicia una nueva consulta.";
    }
    if (error.isNetworkError) return "No pudimos conectar con el sistema. Inténtalo de nuevo.";
  }
  return "No pudimos cargar el perfil académico. Inténtalo de nuevo.";
}
