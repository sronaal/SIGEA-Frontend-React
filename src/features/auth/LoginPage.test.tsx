import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import LoginPage from "@/features/auth/LoginPage";
import { ApiError } from "@/services/http";
import type { AuthApi } from "@/services/auth";
import type { AuthSession } from "@/types/auth";

const STUDENT_SESSION: AuthSession = {
  accessToken: "student-token",
  tokenType: "Bearer",
  scope: "STUDENT",
  role: "ESTUDIANTE",
  expiresAt: "2026-10-19T22:00:00Z",
  user: {
    id: 1,
    nombres: "Mariana",
    apellidos: "Gómez",
    correo: "mariana.gomez@sigea.local",
    rol: "ESTUDIANTE",
    estudianteId: 1,
  },
};

const TEACHER_SESSION: AuthSession = {
  ...STUDENT_SESSION,
  accessToken: "teacher-token",
  scope: "TEACHER",
  role: "PROFESOR",
  user: {
    id: 2,
    nombres: "Andrés",
    apellidos: "Rodríguez",
    correo: "andres.rodriguez@sigea.local",
    rol: "PROFESOR",
    estudianteId: null,
  },
};

function createApi(session: AuthSession = STUDENT_SESSION): AuthApi {
  return {
    login: vi.fn(async () => session),
    me: vi.fn(async () => ({
      scope: session.scope,
      role: session.role,
      expiresAt: session.expiresAt,
      user: session.user,
    })),
  };
}

function renderLogin(api: AuthApi) {
  const router = createMemoryRouter(
    [
      { path: "/login", Component: LoginPage },
      { path: "/estudiante", element: <h1>Mi espacio</h1> },
      { path: "/profesor", element: <h1>Espacio docente</h1> },
      { path: "/acudientes", element: <h1>Consulta académica de acudientes</h1> },
    ],
    { initialEntries: ["/login"] },
  );

  return {
    router,
    ...render(
      <AppProviders authApi={api}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}

function emailInput() {
  return screen.getByLabelText(/correo institucional/i, { selector: "input" });
}

function passwordInput() {
  return screen.getByLabelText(/^contraseña$/i, { selector: "input" });
}

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("shows the access form and the guardian portal link", async () => {
    const user = userEvent.setup();
    renderLogin(createApi());

    expect(screen.getByRole("heading", { name: /inicia sesión/i })).toBeInTheDocument();
    expect(emailInput()).toBeInTheDocument();
    expect(passwordInput()).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /consultar información académica/i }));

    expect(
      await screen.findByRole("heading", { name: /consulta académica de acudientes/i }),
    ).toBeInTheDocument();
  });

  it("requires both fields and a valid email before calling the API", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderLogin(api);

    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(screen.getByText(/ingresa tu correo institucional/i)).toBeInTheDocument();
    expect(screen.getByText(/ingresa tu contraseña/i)).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();

    await user.type(emailInput(), "mariana.gomez");
    await user.type(passwordInput(), "Sigea#2026");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(screen.getByText(/correo institucional válido/i)).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("shows the message of the ApiError contract when the credentials are rejected", async () => {
    const user = userEvent.setup();
    const api = createApi();
    vi.mocked(api.login).mockRejectedValueOnce(
      new ApiError(401, "INVALID_CREDENTIALS", "The credentials are not valid."),
    );
    const { router } = renderLogin(api);

    await user.type(emailInput(), "mariana.gomez@sigea.local");
    await user.type(passwordInput(), "incorrecta");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The credentials are not valid.");
    expect(router.state.location.pathname).toBe("/login");
  });

  it("logs a student in and navigates to the student panel", async () => {
    const user = userEvent.setup();
    const api = createApi(STUDENT_SESSION);
    const { router } = renderLogin(api);

    await user.type(emailInput(), "mariana.gomez@sigea.local");
    await user.type(passwordInput(), "Sigea#2026");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("heading", { name: /mi espacio/i })).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith({
      correo: "mariana.gomez@sigea.local",
      password: "Sigea#2026",
    });
    expect(router.state.location.pathname).toBe("/estudiante");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("logs a teacher in and navigates to the teacher panel", async () => {
    const user = userEvent.setup();
    renderLogin(createApi(TEACHER_SESSION));

    await user.type(emailInput(), "andres.rodriguez@sigea.local");
    await user.type(passwordInput(), "Sigea#2026");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("heading", { name: /espacio docente/i })).toBeInTheDocument();
  });

  it("lets the user reveal the password before submitting", async () => {
    const user = userEvent.setup();
    renderLogin(createApi());

    expect(passwordInput()).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /mostrar contraseña/i }));
    expect(passwordInput()).toHaveAttribute("type", "text");
  });
});
