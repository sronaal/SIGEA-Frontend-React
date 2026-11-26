import { Link, Navigate, createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

import { RequireRole } from "@/app/guards";
import LoginPage from "@/features/auth/LoginPage";
import GradesPage from "@/features/grades/GradesPage";
import {
  ActivityDetailPage,
  StudentActivitiesPage,
  StudentDashboardPage,
  StudentGradesPage,
  StudentProfilePage,
  StudentSubmissionsPage,
} from "@/features/student/StudentPages";
import { AttendancePage, TeacherDashboardPage } from "@/features/teacher/TeacherPages";
import {
  SubmissionsGradingPage,
  TeacherActivitiesPage,
  TeacherGroupsPage,
} from "@/features/teacher/TeacherWorkspace";
import AppLayout from "@/layouts/AppLayout";

function NotFound() {
  return (
    <div className="not-found">
      <h1>Página no encontrada</h1>
      <Link to="/login">Volver al inicio de sesión</Link>
      <Link to="/acudientes">Volver al acceso de acudientes</Link>
    </div>
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
          { path: "/profesor", Component: TeacherDashboardPage },
          { path: "/profesor/grupos", Component: TeacherGroupsPage },
          { path: "/profesor/asistencia", Component: AttendancePage },
          { path: "/profesor/actividades", Component: TeacherActivitiesPage },
          {
            path: "/profesor/actividades/:activityId/entregas",
            Component: SubmissionsGradingPage,
          },
          { path: "/profesor/calificaciones", Component: GradesPage },
          { path: "/profesor/*", Component: NotFound },
        ],
      },
    ],
  },
  { path: "*", Component: NotFound },
];

/** Browser router of the application. */
export const router = createBrowserRouter(routes);
