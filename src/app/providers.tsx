import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { GuardianSessionProvider } from "@/context/GuardianSessionContext";
import { guardianAccessApi } from "@/services/guardianAccess";
import type { GuardianAccessApi } from "@/services/guardianAccess";

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

/** Composes every application-level provider used by the routes. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GuardianAccessApiProvider>
      <GuardianSessionProvider>{children}</GuardianSessionProvider>
    </GuardianAccessApiProvider>
  );
}
