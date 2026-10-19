import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { routes } from "@/app/router";
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

function renderAt(path: string, api: AuthApi = createApi()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <AppProviders authApi={api}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, ...result };
}

async function logIn(user: ReturnType<typeof userEvent.setup>, correo: string) {
  await user.type(screen.getByLabelText(/correo institucional/i, { selector: "input" }), correo);
  await user.type(
    screen.getByLabelText(/^contraseña$/i, { selector: "input" }),
    "Sigea#2026",
  );
  await user.click(screen.getByRole("button", { name: /ingresar/i }));
}

describe("application router", () => {
  it("renders the guardian access screen at /acudientes", async () => {
    renderAt("/acudientes");

    expect(
      await screen.findByRole("heading", { name: /consulta académica de acudientes/i }),
    ).toBeInTheDocument();
  });

  it("redirects the root path to the login screen", async () => {
    renderAt("/");

    expect(await screen.findByRole("heading", { name: /inicia sesión/i })).toBeInTheDocument();
  });

  it("redirects a protected route to the login screen when there is no session", async () => {
    const { router } = renderAt("/estudiante");

    expect(await screen.findByRole("heading", { name: /inicia sesión/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("sends a teacher away from a student route to the teacher panel", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(TEACHER_SESSION));

    await logIn(user, "andres.rodriguez@sigea.local");
    await screen.findByRole("heading", { name: /espacio docente/i });

    await act(async () => {
      await router.navigate("/estudiante");
    });

    expect(router.state.location.pathname).toBe("/profesor");
    expect(screen.getByRole("heading", { name: /espacio docente/i })).toBeInTheDocument();
  });

  it("sends a student away from a teacher route to the student panel", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(STUDENT_SESSION));

    await logIn(user, "mariana.gomez@sigea.local");
    await screen.findByRole("heading", { name: /mi espacio/i });

    await act(async () => {
      await router.navigate("/profesor");
    });

    expect(router.state.location.pathname).toBe("/estudiante");
    expect(screen.getByRole("heading", { name: /mi espacio/i })).toBeInTheDocument();
  });

  it("keeps the session in memory and redirects the login screen once authenticated", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(STUDENT_SESSION));

    await logIn(user, "mariana.gomez@sigea.local");
    await screen.findByRole("heading", { name: /mi espacio/i });

    await act(async () => {
      await router.navigate("/login");
    });

    expect(router.state.location.pathname).toBe("/estudiante");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("shows the shell of the active role and closes the local session", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(STUDENT_SESSION));

    await logIn(user, "mariana.gomez@sigea.local");
    await screen.findByRole("heading", { name: /mi espacio/i });

    expect(screen.getByText("Mariana Gómez")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mis calificaciones/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /cerrar sesión/i }));

    expect(await screen.findByRole("heading", { name: /inicia sesión/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("renders the not found screen for an unknown route", async () => {
    renderAt("/ruta-inexistente");

    expect(await screen.findByRole("heading", { name: /página no encontrada/i })).toBeInTheDocument();
  });
});
