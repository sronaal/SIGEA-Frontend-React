import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthSessionProvider, useAuthSession } from "@/context/AuthSessionContext";
import type { AuthSession } from "@/types/auth";

const SESSION: AuthSession = {
  accessToken: "memory-only-token",
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

function SessionProbe() {
  const { accessToken, role, scope, user, expiresAt, isAuthenticated, startSession, clearSession } =
    useAuthSession();

  return (
    <div>
      <span data-testid="token">{accessToken ?? "sin-sesion"}</span>
      <span data-testid="role">{role ?? "sin-rol"}</span>
      <span data-testid="scope">{scope ?? "sin-alcance"}</span>
      <span data-testid="expires-at">{expiresAt ?? "sin-expiracion"}</span>
      <span data-testid="user">{user ? `${user.nombres} ${user.apellidos}` : "sin-usuario"}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <button type="button" onClick={() => startSession(SESSION)}>
        iniciar sesión
      </button>
      <button type="button" onClick={clearSession}>
        cerrar sesión
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthSessionProvider>
      <SessionProbe />
    </AuthSessionProvider>,
  );
}

describe("AuthSessionContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("starts without a session", () => {
    renderProbe();

    expect(screen.getByTestId("token")).toHaveTextContent("sin-sesion");
    expect(screen.getByTestId("role")).toHaveTextContent("sin-rol");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
  });

  it("keeps the token, the role and the user only in memory", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getByTestId("token")).toHaveTextContent(SESSION.accessToken);
    expect(screen.getByTestId("role")).toHaveTextContent("ESTUDIANTE");
    expect(screen.getByTestId("scope")).toHaveTextContent("STUDENT");
    expect(screen.getByTestId("user")).toHaveTextContent("Mariana Gómez");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(JSON.stringify(window.localStorage)).not.toContain(SESSION.accessToken);
    expect(JSON.stringify(window.sessionStorage)).not.toContain(SESSION.accessToken);
  });

  it("discards the token when the session is cleared", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    await user.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    expect(screen.getByTestId("token")).toHaveTextContent("sin-sesion");
    expect(screen.getByTestId("role")).toHaveTextContent("sin-rol");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
