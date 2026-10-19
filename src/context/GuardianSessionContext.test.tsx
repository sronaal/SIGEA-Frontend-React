import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GuardianSessionProvider, useGuardianSession } from "@/context/GuardianSessionContext";

function SessionProbe() {
  const { accessToken, isAuthenticated, startSession, clearSession } = useGuardianSession();

  return (
    <div>
      <span data-testid="token">{accessToken ?? "sin token"}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <button
        type="button"
        onClick={() => startSession({ accessToken: "token-en-memoria", expiresAt: "2026-10-19T12:10:00Z" })}
      >
        iniciar sesión
      </button>
      <button type="button" onClick={clearSession}>
        cerrar consulta
      </button>
    </div>
  );
}

describe("GuardianSessionContext", () => {
  it("keeps the token in memory and never writes it to the browser storage", async () => {
    const user = userEvent.setup();
    window.localStorage.clear();
    window.sessionStorage.clear();

    render(
      <GuardianSessionProvider>
        <SessionProbe />
      </GuardianSessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getByTestId("token")).toHaveTextContent("token-en-memoria");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("discards the token when the consultation is closed", async () => {
    const user = userEvent.setup();

    render(
      <GuardianSessionProvider>
        <SessionProbe />
      </GuardianSessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    await user.click(screen.getByRole("button", { name: /cerrar consulta/i }));

    expect(screen.getByTestId("token")).toHaveTextContent("sin token");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
  });
});
