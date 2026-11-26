import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { routes } from "@/app/router";
import type { AuthApi } from "@/services/auth";
import type { StudentPortalApi } from "@/services/studentPortal";
import type { TeacherWorkspaceApi } from "@/services/teacherWorkspace";
import type { AuthSession } from "@/types/auth";

const STUDENT_SESSION: AuthSession = {
  accessToken: "student-token",
  tokenType: "Bearer",
  scope: "STUDENT",
  role: "ESTUDIANTE",
  expiresAt: "2026-10-19T22:00:00Z",
  user: {
    id: 1,
    nombres: "Mariana",
    apellidos: "Gómez",
    correo: "mariana.gomez@sigea.local",
    rol: "ESTUDIANTE",
    estudianteId: 1,
  },
};

const TEACHER_SESSION: AuthSession = {
  ...STUDENT_SESSION,
  accessToken: "teacher-token",
  scope: "TEACHER",
  role: "PROFESOR",
  user: {
    id: 2,
    nombres: "Andrés",
    apellidos: "Rodríguez",
    correo: "andres.rodriguez@sigea.local",
    rol: "PROFESOR",
    estudianteId: null,
  },
};

function createApi(session: AuthSession = STUDENT_SESSION): AuthApi {
  return {
    login: vi.fn(async () => session),
    me: vi.fn(async () => ({
      scope: session.scope,
      role: session.role,
      expiresAt: session.expiresAt,
      user: session.user,
    })),
  };
}

function createStudentPortalApi(): StudentPortalApi {
  return {
    getMe: vi.fn(async () => ({
      id: 1,
      nombres: "Mariana",
      apellidos: "Gómez",
      tipoDocumento: "TARJETA_IDENTIDAD",
      numeroDocumento: "1000000001",
      correoInstitucional: "mariana.gomez@sigea.local",
      enrollment: { academicYear: 2026, grade: "8", group: "A", period: 2 },
    })),
    getDashboard: vi.fn(async () => ({
      metrics: {
        generalAverage: 4.2,
        averageStatus: "DEFINITIVE" as const,
        attendancePercentage: 96,
        attendanceStatus: "AVAILABLE" as const,
        pendingActivities: 1,
        submittedActivities: 1,
        gradedActivities: 1,
      },
      nextActivities: [],
      recentGrades: [],
    })),
    getGrades: vi.fn(async () => ({
      generalAverage: 4.2,
      averageStatus: "DEFINITIVE" as const,
      subjects: [],
    })),
    getActivities: vi.fn(async () => ({ activities: [] })),
    getSubmissions: vi.fn(async () => ({ submissions: [] })),
    getAttendance: vi.fn(async () => ({ percentage: 96, records: [] })),
    submitActivity: vi.fn(async (activityId: number) => ({
      id: 1,
      activityId,
      title: "Actividad",
      subject: "Matemáticas",
      submittedAt: "2026-05-20T10:00:00",
      status: "ENTREGADA" as const,
      grade: null,
      feedback: null,
    })),
    uploadFiles: vi.fn(async () => [
      {
        id: 1,
        nombreOriginal: "informe.pdf",
        mimeType: "application/pdf",
        tamanoBytes: 1024,
        creadoEn: "2026-05-20T10:00:00",
      },
    ]),
    getFiles: vi.fn(async () => []),
    deleteFile: vi.fn(async () => undefined),
    getFileBlob: vi.fn(async () => new Blob(["contenido"], { type: "application/pdf" })),
    resubmit: vi.fn(async (submissionId: number) => ({
      id: submissionId,
      activityId: 7,
      title: "Actividad",
      subject: "Matemáticas",
      submittedAt: "2026-05-20T10:00:00",
      status: "ENTREGADA" as const,
      grade: null,
      feedback: null,
    })),
  };
}

function createTeacherWorkspaceApi(): TeacherWorkspaceApi {
  return {
    getAssignments: vi.fn(async () => ({ assignments: [] })),
    getStudents: vi.fn(),
    getAttendance: vi.fn(),
    getActivities: vi.fn(async () => ({ assignmentId: 1, activities: [] })),
    saveAttendance: vi.fn(),
    createActivity: vi.fn(),
    publishActivity: vi.fn(),
    getSubmissions: vi.fn(),
    gradeSubmission: vi.fn(),
    getActivityFiles: vi.fn(async () => []),
    uploadActivityFiles: vi.fn(async () => []),
    deleteActivityFile: vi.fn(),
    createAssessment: vi.fn(),
    getAssessments: vi.fn(async () => ({ assignmentId: 1, accumulatedWeight: 0, assessments: [] })),
    getAssessmentGrades: vi.fn(async () => ({ assessmentId: 1, records: [] })),
    saveGrades: vi.fn(),
  };
}

function renderAt(
  path: string,
  api: AuthApi = createApi(),
  studentPortalApi: StudentPortalApi = createStudentPortalApi(),
) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <AppProviders
      authApi={api}
      studentPortalApi={studentPortalApi}
      teacherWorkspaceApi={createTeacherWorkspaceApi()}
    >
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, ...result };
}

async function logIn(user: ReturnType<typeof userEvent.setup>, correo: string) {
  await user.type(screen.getByLabelText(/correo institucional/i, { selector: "input" }), correo);
  await user.type(
    screen.getByLabelText(/^contraseña$/i, { selector: "input" }),
    "Sigea#2026",
  );
  await user.click(screen.getByRole("button", { name: /ingresar/i }));
}

describe("application router", () => {
  it("renders the guardian access screen at /acudientes", async () => {
    renderAt("/acudientes");

    expect(
      await screen.findByRole("heading", { name: /consulta académica de acudientes/i }),
    ).toBeInTheDocument();
  });

  it("redirects the root path to the login screen", async () => {
    renderAt("/");

    expect(await screen.findByRole("heading", { name: /inicia sesión/i })).toBeInTheDocument();
  });

  it("redirects a protected route to the login screen when there is no session", async () => {
    const { router } = renderAt("/estudiante");

    expect(await screen.findByRole("heading", { name: /inicia sesión/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("sends a teacher away from a student route to the teacher panel", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(TEACHER_SESSION));

    await logIn(user, "andres.rodriguez@sigea.local");
    await screen.findByRole("heading", { name: /hola, andrés/i });

    await act(async () => {
      await router.navigate("/estudiante");
    });

    expect(router.state.location.pathname).toBe("/profesor");
    expect(screen.getByRole("heading", { name: /hola, andrés/i })).toBeInTheDocument();
  });

  it("sends a student away from a teacher route to the student panel", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(STUDENT_SESSION));

    await logIn(user, "mariana.gomez@sigea.local");
    await screen.findByRole("heading", { name: /hola, mariana/i });

    await act(async () => {
      await router.navigate("/profesor");
    });

    expect(router.state.location.pathname).toBe("/estudiante");
    expect(screen.getByRole("heading", { name: /hola, mariana/i })).toBeInTheDocument();
  });

  it("keeps the session in memory and redirects the login screen once authenticated", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(STUDENT_SESSION));

    await logIn(user, "mariana.gomez@sigea.local");
    await screen.findByRole("heading", { name: /hola, mariana/i });

    await act(async () => {
      await router.navigate("/login");
    });

    expect(router.state.location.pathname).toBe("/estudiante");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("shows the shell of the active role and closes the local session", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/login", createApi(STUDENT_SESSION));

    await logIn(user, "mariana.gomez@sigea.local");
    await screen.findByRole("heading", { name: /hola, mariana/i });

    expect(screen.getByText("Mariana Gómez")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mis calificaciones/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /cerrar sesión/i }));

    expect(await screen.findByRole("heading", { name: /inicia sesión/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("renders the not found screen for an unknown route", async () => {
    renderAt("/ruta-inexistente");

    expect(await screen.findByRole("heading", { name: /página no encontrada/i })).toBeInTheDocument();
  });
});
