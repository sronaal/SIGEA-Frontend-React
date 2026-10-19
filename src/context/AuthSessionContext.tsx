import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { AuthRole, AuthScope, AuthSession, AuthUser } from "@/types/auth";

/**
 * Session of the application. The access token lives ONLY in the React state of this provider:
 * it is never written to `localStorage`, `sessionStorage`, cookies or the URL, so a page reload
 * discards it and the user has to sign in again (same criterion as the guardian portal).
 */
export interface AuthSessionValue {
  /** Bearer token of the application session, or `null` when there is no session. */
  accessToken: string | null;
  /** Role reported by the backend for the current session. */
  role: AuthRole | null;
  /** JWT scope reported by the backend for the current session. */
  scope: AuthScope | null;
  /** Identity of the account behind the session. */
  user: AuthUser | null;
  /** Expiration instant reported by the API for the current session. */
  expiresAt: string | null;
  /** True while a validated session is held in memory. */
  isAuthenticated: boolean;
  /** Stores a freshly minted session in memory. */
  startSession: (session: AuthSession) => void;
  /** Discards the session (the "Cerrar sesión" action). */
  clearSession: () => void;
}

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  const startSession = useCallback((next: AuthSession) => {
    setSession(next);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo<AuthSessionValue>(
    () => ({
      accessToken: session?.accessToken ?? null,
      role: session?.role ?? null,
      scope: session?.scope ?? null,
      user: session?.user ?? null,
      expiresAt: session?.expiresAt ?? null,
      isAuthenticated: session !== null,
      startSession,
      clearSession,
    }),
    [session, startSession, clearSession],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

/** Reads the in-memory application session. */
export function useAuthSession(): AuthSessionValue {
  const session = useContext(AuthSessionContext);
  if (!session) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider");
  }
  return session;
}
