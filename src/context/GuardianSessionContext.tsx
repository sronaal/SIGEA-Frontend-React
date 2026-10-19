import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Session of the guardian portal. The access token lives ONLY in the React state of this
 * provider: it is never written to `localStorage`, `sessionStorage`, cookies or the URL, so a
 * page reload discards it and the guardian has to validate a new code.
 */
export interface GuardianSessionValue {
  /** Bearer token of the read-only guardian session, or `null` when there is no session. */
  accessToken: string | null;
  /** Expiration instant reported by the API for the current session. */
  expiresAt: string | null;
  /** True while a validated session is held in memory. */
  isAuthenticated: boolean;
  /** Stores a freshly minted session in memory. */
  startSession: (session: { accessToken: string; expiresAt: string }) => void;
  /** Discards the session (the "Cerrar consulta" action). */
  clearSession: () => void;
}

const GuardianSessionContext = createContext<GuardianSessionValue | null>(null);

export function GuardianSessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const startSession = useCallback((session: { accessToken: string; expiresAt: string }) => {
    setAccessToken(session.accessToken);
    setExpiresAt(session.expiresAt);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setExpiresAt(null);
  }, []);

  const value = useMemo<GuardianSessionValue>(
    () => ({
      accessToken,
      expiresAt,
      isAuthenticated: accessToken !== null,
      startSession,
      clearSession,
    }),
    [accessToken, expiresAt, startSession, clearSession],
  );

  return <GuardianSessionContext.Provider value={value}>{children}</GuardianSessionContext.Provider>;
}

/** Reads the in-memory guardian session. */
export function useGuardianSession(): GuardianSessionValue {
  const session = useContext(GuardianSessionContext);
  if (!session) {
    throw new Error("useGuardianSession must be used within a GuardianSessionProvider");
  }
  return session;
}
