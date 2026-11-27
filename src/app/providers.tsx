import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { GuardianSessionProvider } from "@/context/GuardianSessionContext";
import { LanguageProvider } from "@/context/LanguageContext";
import type { AuthApi } from "@/services/auth";
import { authApi as defaultAuthApi } from "@/services/auth";
import { guardianAccessApi } from "@/services/guardianAccess";
import type { GuardianAccessApi } from "@/services/guardianAccess";
import { studentPortalApi as defaultStudentPortalApi } from "@/services/studentPortal";
import type { StudentPortalApi } from "@/services/studentPortal";
import { teacherWorkspaceApi as defaultTeacherWorkspaceApi } from "@/services/teacherWorkspace";
import type { TeacherWorkspaceApi } from "@/services/teacherWorkspace";

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

const TeacherWorkspaceApiContext = createContext<TeacherWorkspaceApi | null>(null);

/**
 * Makes the teacher workspace API injectable. The application uses the real client; the tests
 * inject a fake built with `vi.fn()`.
 */
export function TeacherWorkspaceApiProvider({
  api,
  children,
}: {
  api?: TeacherWorkspaceApi;
  children: ReactNode;
}) {
  const value = useMemo<TeacherWorkspaceApi>(() => api ?? defaultTeacherWorkspaceApi, [api]);
  return (
    <TeacherWorkspaceApiContext.Provider value={value}>
      {children}
    </TeacherWorkspaceApiContext.Provider>
  );
}

/** Reads the teacher workspace API bound to the closest provider. */
export function useTeacherWorkspaceApi(): TeacherWorkspaceApi {
  const api = useContext(TeacherWorkspaceApiContext);
  if (!api) {
    throw new Error("useTeacherWorkspaceApi must be used within a TeacherWorkspaceApiProvider");
  }
  return api;
}

/** Composes every application-level provider used by the routes. */
export function AppProviders({
  children,
  authApi,
  studentPortalApi,
  teacherWorkspaceApi,
}: {
  children: ReactNode;
  authApi?: AuthApi;
  studentPortalApi?: StudentPortalApi;
  teacherWorkspaceApi?: TeacherWorkspaceApi;
}) {
  return (
    <LanguageProvider>
      <AuthApiProvider api={authApi}>
        <AuthSessionProvider>
          <StudentPortalApiProvider api={studentPortalApi}>
            <TeacherWorkspaceApiProvider api={teacherWorkspaceApi}>
              <GuardianAccessApiProvider>
                <GuardianSessionProvider>{children}</GuardianSessionProvider>
              </GuardianAccessApiProvider>
            </TeacherWorkspaceApiProvider>
          </StudentPortalApiProvider>
        </AuthSessionProvider>
      </AuthApiProvider>
    </LanguageProvider>
  );
}
