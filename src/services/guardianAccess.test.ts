import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, createHttpClient } from "@/services/http";
import { createGuardianAccessApi } from "@/services/guardianAccess";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    url: "http://api.test",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("guardian access client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the identity document to the request endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { message: "mensaje genérico" }));

    const api = createGuardianAccessApi(createHttpClient("http://api.test"));
    const result = await api.request({ tipoDocumento: "CEDULA_CIUDADANIA", numeroDocumento: "123456" });

    expect(result.message).toBe("mensaje genérico");

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call ?? [];
    expect(url).toBe("http://api.test/api/v1/guardian-access/request");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      tipoDocumento: "CEDULA_CIUDADANIA",
      numeroDocumento: "123456",
    });
  });

  it("posts the code to the verify endpoint and returns the session", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        accessToken: "token-123",
        tokenType: "Bearer",
        scope: "GUARDIAN_READONLY",
        expiresAt: "2026-10-19T12:10:00Z",
      }),
    );

    const api = createGuardianAccessApi(createHttpClient("http://api.test"));
    const session = await api.verify({
      tipoDocumento: "TARJETA_IDENTIDAD",
      numeroDocumento: "123456",
      codigo: "123456",
    });

    expect(session.accessToken).toBe("token-123");
    expect(session.tokenType).toBe("Bearer");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://api.test/api/v1/guardian-access/verify");
    expect(init?.method).toBe("POST");
  });

  it("reads the profile with the bearer token attached to the request", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { student: {}, enrollment: {}, metrics: {}, activities: [], session: {} }));

    const api = createGuardianAccessApi(createHttpClient("http://api.test"));
    await api.profile("token-123");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://api.test/api/v1/guardian-access/profile");
    expect(init?.method).toBe("GET");
    const headers = init?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("translates a backend ApiError into a typed error", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        timestamp: "2026-10-19T12:00:00Z",
        status: 401,
        error: "INVALID_OTP",
        message: "The verification code is not valid.",
        path: "/api/v1/guardian-access/verify",
      }),
    );

    const api = createGuardianAccessApi(createHttpClient("http://api.test"));

    await expect(
      api.verify({ tipoDocumento: "TARJETA_IDENTIDAD", numeroDocumento: "123456", codigo: "000000" }),
    ).rejects.toBeInstanceOf(ApiError);

    await expect(
      api.verify({ tipoDocumento: "TARJETA_IDENTIDAD", numeroDocumento: "123456", codigo: "000000" }),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_OTP" });
  });

  it("reports a locked challenge as a 429 error", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, {
        timestamp: "2026-10-19T12:00:00Z",
        status: 429,
        error: "TOO_MANY_ATTEMPTS",
        message: "The verification code was used too many times.",
        path: "/api/v1/guardian-access/verify",
      }),
    );

    const api = createGuardianAccessApi(createHttpClient("http://api.test"));

    await expect(
      api.verify({ tipoDocumento: "TARJETA_IDENTIDAD", numeroDocumento: "123456", codigo: "000000" }),
    ).rejects.toMatchObject({ status: 429, code: "TOO_MANY_ATTEMPTS" });
  });

  it("reports an unreachable API as a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const api = createGuardianAccessApi(createHttpClient("http://api.test"));

    await expect(api.request({ tipoDocumento: "TARJETA_IDENTIDAD", numeroDocumento: "123456" })).rejects.toMatchObject(
      { status: 0, code: "NETWORK_ERROR" },
    );
  });
});
