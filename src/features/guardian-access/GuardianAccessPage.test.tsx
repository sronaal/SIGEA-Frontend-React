import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GuardianAccessApiProvider } from "@/app/providers";
import { GuardianSessionProvider } from "@/context/GuardianSessionContext";
import GuardianAccessPage from "@/features/guardian-access/GuardianAccessPage";
import { ApiError } from "@/services/http";
import type { GuardianAccessApi } from "@/services/guardianAccess";
import type { GuardianProfile } from "@/types/guardian";

const GENERIC_MESSAGE =
  "Si el documento corresponde a un estudiante con un acudiente autorizado, enviaremos un código de verificación al contacto registrado.";

const PROFILE: GuardianProfile = {
  student: {
    firstName: "Mariana",
    lastName: "Gómez",
    documentType: "CEDULA_CIUDADANIA",
    documentNumber: "123456",
  },
  enrollment: { academicYear: 2026, grade: "8", group: "A", period: 2 },
  metrics: {
    generalAverage: 4.2,
    averageStatus: "PROVISIONAL",
    attendancePercentage: 96,
    attendanceStatus: "AVAILABLE",
  },
  activities: [
    { subject: "Matemáticas", title: "Informe de ecosistemas", dueDate: "2026-05-22", status: "PENDIENTE" },
  ],
  session: { expiresAt: "2026-10-19T12:10:00Z" },
};

function createApi(overrides: Partial<GuardianAccessApi> = {}): GuardianAccessApi {
  return {
    request: vi.fn(async () => ({ message: GENERIC_MESSAGE })),
    verify: vi.fn(async () => ({
      accessToken: "token-en-memoria",
      tokenType: "Bearer",
      scope: "GUARDIAN_READONLY",
      expiresAt: "2026-10-19T12:10:00Z",
    })),
    profile: vi.fn(async () => PROFILE),
    ...overrides,
  };
}

function renderPage(api: GuardianAccessApi) {
  return render(
    <GuardianAccessApiProvider api={api}>
      <GuardianSessionProvider>
        <GuardianAccessPage />
      </GuardianSessionProvider>
    </GuardianAccessApiProvider>,
  );
}

async function completeIdentifyStep(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/tipo de documento/i), "CEDULA_CIUDADANIA");
  await user.type(screen.getByLabelText(/número de documento/i), "123456");
  await user.click(screen.getByRole("button", { name: /continuar/i }));
}

describe("GuardianAccessPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("moves from the identification step to the code step", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderPage(api);

    await completeIdentifyStep(user);

    expect(
      await screen.findByRole("heading", { name: /ingresa el código de seis dígitos/i }),
    ).toBeInTheDocument();
    expect(api.request).toHaveBeenCalledWith({
      tipoDocumento: "CEDULA_CIUDADANIA",
      numeroDocumento: "123456",
    });
  });

  it("shows the real metrics of the profile once the code is validated", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderPage(api);

    await completeIdentifyStep(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(await screen.findByRole("heading", { name: "Mariana Gómez" })).toBeInTheDocument();
    expect(screen.getByText("4,2")).toBeInTheDocument();
    expect(screen.getByText("96%")).toBeInTheDocument();
    expect(screen.getByText("Provisional")).toBeInTheDocument();
    expect(screen.getByText("Informe de ecosistemas")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(api.verify).toHaveBeenCalledWith({
      tipoDocumento: "CEDULA_CIUDADANIA",
      numeroDocumento: "123456",
      codigo: "123456",
    });
    expect(api.profile).toHaveBeenCalledWith("token-en-memoria");
  });

  it("never persists the session token in the browser storage", async () => {
    const user = userEvent.setup();
    renderPage(createApi());

    await completeIdentifyStep(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await screen.findByRole("heading", { name: "Mariana Gómez" });

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("reports an invalid code and stays on the code step", async () => {
    const user = userEvent.setup();
    const api = createApi({
      verify: vi.fn(async () => {
        throw new ApiError(401, "INVALID_OTP", "The verification code is not valid.");
      }),
    });
    renderPage(api);

    await completeIdentifyStep(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "000000");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no es válido/i);
    expect(
      screen.getByRole("heading", { name: /ingresa el código de seis dígitos/i }),
    ).toBeInTheDocument();
  });

  it("locks the verification when the challenge is exhausted", async () => {
    const user = userEvent.setup();
    const api = createApi({
      verify: vi.fn(async () => {
        throw new ApiError(429, "TOO_MANY_ATTEMPTS", "The verification code was used too many times.");
      }),
    });
    renderPage(api);

    await completeIdentifyStep(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "000000");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/superaste el número de intentos/i);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /verificar código/i })).toBeDisabled();
    });
  });

  it("says explicitly that a metric is unavailable instead of showing an invented figure", async () => {
    const user = userEvent.setup();
    const api = createApi({
      profile: vi.fn(async (): Promise<GuardianProfile> => ({
        ...PROFILE,
        enrollment: { academicYear: null, grade: null, group: null, period: null },
        metrics: {
          generalAverage: null,
          averageStatus: "UNAVAILABLE",
          attendancePercentage: null,
          attendanceStatus: "UNAVAILABLE",
        },
        activities: [],
      })),
    });
    renderPage(api);

    await completeIdentifyStep(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await screen.findByRole("heading", { name: "Mariana Gómez" });

    expect(screen.getAllByText("No disponible").length).toBeGreaterThan(0);
    expect(screen.queryByText("4,2")).toBeNull();
    expect(screen.getByText(/sin matrícula activa/i)).toBeInTheDocument();
  });

  it("discards the session and returns to the first step when the consultation is closed", async () => {
    const user = userEvent.setup();
    renderPage(createApi());

    await completeIdentifyStep(user);
    await user.type(await screen.findByLabelText(/código de verificación/i), "123456");
    await user.click(screen.getByRole("button", { name: /verificar código/i }));

    await screen.findByRole("heading", { name: "Mariana Gómez" });
    await user.click(screen.getByRole("button", { name: /cerrar consulta/i }));

    expect(
      await screen.findByRole("heading", { name: /consulta académica de acudientes/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mariana Gómez" })).toBeNull();
  });
});
