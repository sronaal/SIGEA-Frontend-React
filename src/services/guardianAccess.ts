import { httpClient } from "@/services/http";
import type { HttpClient } from "@/services/http";
import type {
  GuardianProfile,
  OtpRequestPayload,
  OtpRequestResponse,
  OtpVerifyPayload,
  OtpVerifyResponse,
} from "@/types/guardian";

/** Base path of the guardian-access capability in the SIGEA API. */
export const GUARDIAN_ACCESS_BASE_PATH = "/api/v1/guardian-access";

/**
 * Read-only surface of the guardian portal. The interface exists so the tests can inject a
 * fake (`vi.fn()`) instead of hitting the real API.
 */
export interface GuardianAccessApi {
  /** Requests a one-time code. Always answers 202 with the same generic body. */
  request(payload: OtpRequestPayload): Promise<OtpRequestResponse>;
  /** Verifies the code and mints the short lived read-only session. */
  verify(payload: OtpVerifyPayload): Promise<OtpVerifyResponse>;
  /** Reads the authorized academic profile of the student bound to the session. */
  profile(accessToken: string): Promise<GuardianProfile>;
}

/** Creates a client bound to a given HTTP client (or to the default one). */
export function createGuardianAccessApi(client: HttpClient = httpClient): GuardianAccessApi {
  return {
    request: (payload) => client.post<OtpRequestResponse>(`${GUARDIAN_ACCESS_BASE_PATH}/request`, payload),
    verify: (payload) => client.post<OtpVerifyResponse>(`${GUARDIAN_ACCESS_BASE_PATH}/verify`, payload),
    profile: (accessToken) => client.get<GuardianProfile>(`${GUARDIAN_ACCESS_BASE_PATH}/profile`, accessToken),
  };
}

/** Default API client used by the application. */
export const guardianAccessApi: GuardianAccessApi = createGuardianAccessApi();
