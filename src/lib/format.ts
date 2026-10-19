import { ApiError } from "@/services/http";

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

/** Formats a single decimal grade the way the institution writes it (`4,5`). */
export function formatGrade(value: number | null): string {
  return value === null ? "—" : value.toFixed(1).replace(".", ",");
}

/** Formats a percentage; a missing value is an em dash, never an invented number. */
export function formatPercentage(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

/** Parses a backend `yyyy-MM-dd` date as a local calendar date, avoiding the UTC shift. */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = parseLocalDate(value);
  return parsed ? DATE_FORMATTER.format(parsed) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : DATE_TIME_FORMATTER.format(parsed);
}

/** Today as the `yyyy-MM-dd` value required by the date inputs of the API. */
export function todayAsIsoDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

/** Message of the `ApiError` contract, or a fallback for unexpected failures. */
export function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback;
}

/** Initials of a person, used by the avatar component. */
export function initialsOf(nombres: string, apellidos: string): string {
  const initials = `${nombres.trim().charAt(0)}${apellidos.trim().charAt(0)}`.toUpperCase();
  return initials || "SG";
}

/**
 * Validates a grade typed by the professor: between 0.0 and 5.0 with at most one decimal.
 * Returns the error copy, or `null` when the value is valid.
 */
export function gradeValidationError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Escribe una nota entre 0,0 y 5,0.";
  if (!/^\d+(?:\.\d)?$/.test(value)) return "Usa una sola cifra decimal (por ejemplo, 4,5).";
  const numeric = Number(value);
  if (numeric < 0 || numeric > 5) return "La nota debe estar entre 0,0 y 5,0.";
  return null;
}

/** Numeric grade with the single decimal expected by the API. */
export function toApiGrade(raw: string): number {
  return Number(Number(raw.trim()).toFixed(1));
}
