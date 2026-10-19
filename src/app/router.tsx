import { Navigate, createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

import { RequireRole } from "@/app/guards";
import { PageHeader } from "@/components/ui";
import LoginPage from "@/features/auth/LoginPage";
import {
  ActivityDetailPage,
  StudentActivitiesPage,
  StudentDashboardPage,
  StudentGradesPage,
  StudentProfilePage,
  StudentSubmissionsPage,
} from "@/features/student/StudentPages";
import AppLayout from "@/layouts/AppLayout";

function NotFound() {
  return (
    <div className="not-found">
      <h1>Página no encontrada</h1>
      <a href="/login">Volver al inicio de sesión</a>
      <a href="/acudientes">Volver al acceso de acudientes</a>
    </div>
  );
}

/** Temporary landing of the teacher role; the real screens arrive in the next wave. */
function TeacherHome() {
  return (
    <PageHeader
      eyebrow="ESPACIO DOCENTE"
      title="Espacio docente"
      description="Aquí verás tus grupos, asignaturas y actividades."
    />
  );
}

/** Temporary screen for the teacher sections that the next wave replaces with the real pages. */
function PendingScreen() {
  return (
    <PageHeader
      eyebrow="PRÓXIMA ENTREGA"
      title="Próximamente"
      description="Esta sección se habilitará con las pantallas conectadas a la API."
    />
  );
}

/**
 * Route table of the application. It is exported so the tests can mount the very same routes
 * with `createMemoryRouter` instead of the browser history.
 */
export const routes: RouteObject[] = [
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", Component: LoginPage },
  {
    path: "/acudientes",
    lazy: async () => ({
      Component: (await import("@/features/guardian-access/GuardianAccessPage")).default,
    }),
  },
  {
    element: <RequireRole role="ESTUDIANTE" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/estudiante", Component: StudentDashboardPage },
          { path: "/estudiante/calificaciones", Component: StudentGradesPage },
          { path: "/estudiante/actividades", Component: StudentActivitiesPage },
          { path: "/estudiante/actividades/:activityId", Component: ActivityDetailPage },
          { path: "/estudiante/entregas", Component: StudentSubmissionsPage },
          { path: "/estudiante/perfil", Component: StudentProfilePage },
          { path: "/estudiante/*", Component: NotFound },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="PROFESOR" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/profesor", Component: TeacherHome },
          { path: "/profesor/*", Component: PendingScreen },
        ],
      },
    ],
  },
  { path: "*", Component: NotFound },
];

/** Browser router of the application. */
export const router = createBrowserRouter(routes);
