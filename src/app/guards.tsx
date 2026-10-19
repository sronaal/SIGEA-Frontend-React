import { Navigate, Outlet, useLocation } from "react-router";

import { useAuthSession } from "@/context/AuthSessionContext";
import { roleHomePath } from "@/types/auth";
import type { AuthRole } from "@/types/auth";

/**
 * Requires any application session. Without a session it sends the visitor to the login screen
 * and remembers where it was going.
 */
export function RequireAuth() {
  const { isAuthenticated } = useAuthSession();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/**
 * Requires a session of a given role. Without a session it sends the visitor to the login
 * screen; with a session of the other role it sends it to the panel of its own role, never to a
 * foreign view.
 */
export function RequireRole({ role }: { role: AuthRole }) {
  const { isAuthenticated, role: currentRole } = useAuthSession();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (currentRole !== role) {
    return <Navigate to={roleHomePath(currentRole)} replace />;
  }

  return <Outlet />;
}
