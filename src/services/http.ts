import type { ApiErrorPayload } from "@/types/guardian";

/** Fallback used when `VITE_API_URL` is not provided at build time. */
export const DEFAULT_API_BASE_URL = "http://localhost:8080";

/** Base URL of the SIGEA API, taken from `VITE_API_URL` at build time. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, "");

/** Error raised for every failed HTTP interaction, carrying the backend `ApiError` contract. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly path: string | null;

  constructor(status: number, code: string, message: string, path: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.path = path;
  }

  /** True when the session is missing, expired or no longer valid. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the challenge was locked after too many failed attempts. */
  get isTooManyAttempts(): boolean {
    return this.status === 429;
  }

  /** True when the request body was rejected by the backend validation. */
  get isValidation(): boolean {
    return this.status === 400;
  }

  /** True when the relationship behind the session was revoked. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** True when the request never reached the API. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export interface HttpClient {
  get<T>(path: string, accessToken?: string): Promise<T>;
  post<T>(path: string, body: unknown, accessToken?: string): Promise<T>;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ApiErrorPayload>;
  return typeof candidate.status === "number" && typeof candidate.message === "string";
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (isApiErrorPayload(payload)) {
    return new ApiError(
      payload.status,
      payload.error,
      payload.message,
      typeof payload.path === "string" ? payload.path : null,
    );
  }

  return new ApiError(
    response.status,
    response.statusText || "UNKNOWN_ERROR",
    `The API answered with status ${response.status}.`,
    response.url,
  );
}

function buildHeaders(accessToken?: string): Headers {
  const headers = new Headers({ Accept: "application/json" });
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

/**
 * Creates an HTTP client bound to a base URL. The guardian session token is never persisted
 * here: it is passed per call and kept in memory by the session context.
 */
export function createHttpClient(baseUrl: string): HttpClient {
  const url = (path: string): string => `${baseUrl.replace(/\/+$/, "")}${path}`;

  const send = async <T>(
    path: string,
    method: "GET" | "POST",
    body: unknown,
    accessToken?: string,
  ): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(url(path), {
        method,
        headers: buildHeaders(accessToken),
        ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(0, "NETWORK_ERROR", "The API is unreachable.");
    }

    if (!response.ok) {
      throw await toApiError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  };

  return {
    get: <T>(path: string, accessToken?: string) => send<T>(path, "GET", undefined, accessToken),
    post: <T>(path: string, body: unknown, accessToken?: string) => send<T>(path, "POST", body, accessToken),
  };
}

/** Default client, pointed at the configured API base URL. */
export const httpClient: HttpClient = createHttpClient(API_BASE_URL);
