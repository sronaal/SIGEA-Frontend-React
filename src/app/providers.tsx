import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { GuardianSessionProvider } from "@/context/GuardianSessionContext";
import type { AuthApi } from "@/services/auth";
import { authApi as defaultAuthApi } from "@/services/auth";
import { guardianAccessApi } from "@/services/guardianAccess";
import type { GuardianAccessApi } from "@/services/guardianAccess";
import { studentPortalApi as defaultStudentPortalApi } from "@/services/studentPortal";
import type { StudentPortalApi } from "@/services/studentPortal";

const GuardianAccessApiContext = createContext<GuardianAccessApi | null>(null);

/**
 * Makes the guardian-access API injectable. The application uses the real client; the tests
 * inject a fake built with `vi.fn()`.
 */
export function GuardianAccessApiProvider({
  api,
  children,
}: {
  api?: GuardianAccessApi;
  children: ReactNode;
}) {
  const value = useMemo<GuardianAccessApi>(() => api ?? guardianAccessApi, [api]);
  return <GuardianAccessApiContext.Provider value={value}>{children}</GuardianAccessApiContext.Provider>;
}

/** Reads the guardian-access API bound to the closest provider. */
export function useGuardianAccessApi(): GuardianAccessApi {
  const api = useContext(GuardianAccessApiContext);
  if (!api) {
    throw new Error("useGuardianAccessApi must be used within a GuardianAccessApiProvider");
  }
  return api;
}

const AuthApiContext = createContext<AuthApi | null>(null);

/**
 * Makes the application-access API injectable. The application uses the real client; the tests
 * inject a fake built with `vi.fn()`.
 */
export function AuthApiProvider({ api, children }: { api?: AuthApi; children: ReactNode }) {
  const value = useMemo<AuthApi>(() => api ?? defaultAuthApi, [api]);
  return <AuthApiContext.Provider value={value}>{children}</AuthApiContext.Provider>;
}

/** Reads the application-access API bound to the closest provider. */
export function useAuthApi(): AuthApi {
  const api = useContext(AuthApiContext);
  if (!api) {
    throw new Error("useAuthApi must be used within an AuthApiProvider");
  }
  return api;
}

const StudentPortalApiContext = createContext<StudentPortalApi | null>(null);

/**
 * Makes the student portal API injectable. The application uses the real client; the tests
 * inject a fake built with `vi.fn()`.
 */
export function StudentPortalApiProvider({
  api,
  children,
}: {
  api?: StudentPortalApi;
  children: ReactNode;
}) {
  const value = useMemo<StudentPortalApi>(() => api ?? defaultStudentPortalApi, [api]);
  return (
    <StudentPortalApiContext.Provider value={value}>{children}</StudentPortalApiContext.Provider>
  );
}

/** Reads the student portal API bound to the closest provider. */
export function useStudentPortalApi(): StudentPortalApi {
  const api = useContext(StudentPortalApiContext);
  if (!api) {
    throw new Error("useStudentPortalApi must be used within a StudentPortalApiProvider");
  }
  return api;
}

/** Composes every application-level provider used by the routes. */
export function AppProviders({
  children,
  authApi,
  studentPortalApi,
}: {
  children: ReactNode;
  authApi?: AuthApi;
  studentPortalApi?: StudentPortalApi;
}) {
  return (
    <AuthApiProvider api={authApi}>
      <AuthSessionProvider>
        <StudentPortalApiProvider api={studentPortalApi}>
          <GuardianAccessApiProvider>
            <GuardianSessionProvider>{children}</GuardianSessionProvider>
          </GuardianAccessApiProvider>
        </StudentPortalApiProvider>
      </AuthSessionProvider>
    </AuthApiProvider>
  );
}
