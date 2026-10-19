import { Navigate, createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

function NotFound() {
  return (
    <div className="not-found">
      <h1>Página no encontrada</h1>
      <a href="/acudientes">Volver al acceso de acudientes</a>
    </div>
  );
}

/**
 * Route table of the application. It is exported so the tests can mount the very same routes
 * with `createMemoryRouter` instead of the browser history.
 */
export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/acudientes" replace /> },
  {
    path: "/acudientes",
    lazy: async () => ({
      Component: (await import("@/features/guardian-access/GuardianAccessPage")).default,
    }),
  },
  { path: "*", Component: NotFound },
];

/** Browser router of the application. */
export const router = createBrowserRouter(routes);
