/**
 * Mirror of the authentication contract of the SIGEA API.
 *
 * Source of truth (backend, Spring Boot):
 *   com.sigea.auth.LoginRequest / AuthResponse / AuthUserView / SessionIdentity
 *
 * The role and the scope are always the ones reported by the backend: the frontend never derives
 * them from the credentials or from a selector of its own.
 */

/** Application roles of the MVP. */
export type AuthRole = "ESTUDIANTE" | "PROFESOR";

/** JWT scopes minted by the backend for each role. */
export type AuthScope = "STUDENT" | "TEACHER";

/** Identity of the account behind a session. */
export interface AuthUser {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: AuthRole;
  /** Identifier of the student linked to the account; `null` for a teacher. */
  estudianteId: number | null;
}

/** Body of `POST /api/v1/auth/login`. */
export interface LoginPayload {
  correo: string;
  password: string;
}

/** Body of the 200 answer of `POST /api/v1/auth/login`. */
export interface AuthSession {
  accessToken: string;
  tokenType: string;
  scope: AuthScope;
  role: AuthRole;
  expiresAt: string;
  user: AuthUser;
}

/** Body of the 200 answer of `GET /api/v1/auth/me`. */
export interface SessionIdentity {
  scope: AuthScope;
  role: AuthRole;
  expiresAt: string;
  user: AuthUser;
}

/** Panel of each role after a successful login. */
const ROLE_HOME: Record<AuthRole, string> = {
  ESTUDIANTE: "/estudiante",
  PROFESOR: "/profesor",
};

/** Resolves the landing route of a role; without a role it falls back to the login screen. */
export function roleHomePath(role: AuthRole | null): string {
  return role ? ROLE_HOME[role] : "/login";
}

/** Human readable label of a role, used by the shell. */
export function roleLabel(role: AuthRole | null): string {
  if (role === "ESTUDIANTE") return "Estudiante";
  if (role === "PROFESOR") return "Profesor";
  return "Sin rol";
}
