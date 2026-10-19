import { httpClient } from "@/services/http";
import type { HttpClient } from "@/services/http";
import type { AuthSession, LoginPayload, SessionIdentity } from "@/types/auth";

/** Base path of the application access in the SIGEA API. */
export const AUTH_BASE_PATH = "/api/v1/auth";

/**
 * Surface of the application access. The interface exists so the tests can inject a fake
 * (`vi.fn()`) instead of hitting the real API.
 */
export interface AuthApi {
  /** Verifies the credentials and returns the in-memory session minted by the backend. */
  login(payload: LoginPayload): Promise<AuthSession>;
  /** Reads the identity of the current session, always resolved from the validated token. */
  me(accessToken: string): Promise<SessionIdentity>;
}

/** Creates a client bound to a given HTTP client (or to the default one). */
export function createAuthApi(client: HttpClient = httpClient): AuthApi {
  return {
    login: (payload) => client.post<AuthSession>(`${AUTH_BASE_PATH}/login`, payload),
    me: (accessToken) => client.get<SessionIdentity>(`${AUTH_BASE_PATH}/me`, accessToken),
  };
}

/** Default API client used by the application. */
export const authApi: AuthApi = createAuthApi();
