import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  ActivityDetailPage,
  StudentActivitiesPage,
  StudentDashboardPage,
  StudentGradesPage,
  StudentProfilePage,
  StudentSubmissionsPage,
} from "@/features/student/StudentPages";
import { ApiError } from "@/services/http";
import type { StudentPortalApi } from "@/services/studentPortal";
import type {
  StudentActivities,
  StudentDashboard,
  StudentGrades,
  StudentProfile,
  StudentSubmission,
  StudentSubmissions,
} from "@/types/academic";
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

const PROFILE: StudentProfile = {
  id: 1,
  nombres: "Mariana",
  apellidos: "Gómez",
  tipoDocumento: "TARJETA_IDENTIDAD",
  numeroDocumento: "1000000001",
  correoInstitucional: "mariana.gomez@sigea.local",
  enrollment: { academicYear: 2026, grade: "8", group: "A", period: 2 },
};

const DASHBOARD: StudentDashboard = {
  metrics: {
    generalAverage: 4.5,
    averageStatus: "DEFINITIVE",
    attendancePercentage: 83,
    attendanceStatus: "AVAILABLE",
    pendingActivities: 1,
    submittedActivities: 1,
    gradedActivities: 1,
  },
  nextActivities: [
    {
      id: 7,
      title: "Informe de ecosistemas",
      subject: "Ciencias Naturales",
      dueDate: "2026-05-22",
      status: "PENDIENTE",
    },
  ],
  recentGrades: [{ assessment: "Parcial 1", subject: "Matemáticas", weight: 40, grade: 4.5 }],
};

const DASHBOARD_UNAVAILABLE: StudentDashboard = {
  metrics: {
    generalAverage: null,
    averageStatus: "UNAVAILABLE",
    attendancePercentage: null,
    attendanceStatus: "UNAVAILABLE",
    pendingActivities: 0,
    submittedActivities: 0,
    gradedActivities: 0,
  },
  nextActivities: [],
  recentGrades: [],
};

const GRADES: StudentGrades = {
  generalAverage: 4.2,
  averageStatus: "DEFINITIVE",
  subjects: [
    {
      subject: "Matemáticas",
      average: 4.5,
      averageStatus: "DEFINITIVE",
      grades: [
        {
          assessmentId: 1,
          assessment: "Parcial 1",
          weight: 40,
          grade: 4.5,
          period: 2,
          feedback: "Buen trabajo.",
        },
        {
          assessmentId: 2,
          assessment: "Taller de ecuaciones",
          weight: 20,
          grade: null,
          period: 2,
          feedback: null,
        },
      ],
    },
    {
      subject: "Ciencias Naturales",
      average: 3.8,
      averageStatus: "PROVISIONAL",
      grades: [
        {
          assessmentId: 3,
          assessment: "Informe de laboratorio",
          weight: 20,
          grade: 3.8,
          period: 2,
          feedback: null,
        },
      ],
    },
  ],
};

const ACTIVITIES: StudentActivities = {
  activities: [
    {
      id: 7,
      title: "Informe de ecosistemas",
      subject: "Ciencias Naturales",
      dueDate: "2026-05-22",
      description: "Analiza un ecosistema colombiano y presenta tus conclusiones.",
      status: "PENDIENTE",
      grade: null,
      feedback: null,
    },
    {
      id: 8,
      title: "Ensayo: voces de la memoria",
      subject: "Lengua Castellana",
      dueDate: "2026-05-20",
      description: "Texto argumentativo de máximo tres páginas.",
      status: "CALIFICADA",
      grade: 4.0,
      feedback: "Buena argumentación.",
    },
    {
      id: 9,
      title: "Mapa de regiones naturales",
      subject: "Ciencias Sociales",
      dueDate: "2026-05-18",
      description: "Ubica y describe las regiones naturales del país.",
      status: "ENTREGADA",
      grade: null,
      feedback: null,
    },
  ],
};

const SUBMISSIONS: StudentSubmissions = {
  submissions: [
    {
      id: 1,
      activityId: 8,
      title: "Ensayo: voces de la memoria",
      subject: "Lengua Castellana",
      submittedAt: "2026-05-20T10:00:00",
      status: "CALIFICADA",
      grade: 4.5,
      feedback: "Buena argumentación.",
    },
    {
      id: 2,
      activityId: 9,
      title: "Mapa de regiones naturales",
      subject: "Ciencias Sociales",
      submittedAt: "2026-05-21T15:30:00",
      status: "ENTREGADA",
      grade: null,
      feedback: null,
    },
  ],
};

const SUBMISSION: StudentSubmission = {
  id: 3,
  activityId: 7,
  title: "Informe de ecosistemas",
  subject: "Ciencias Naturales",
  submittedAt: "2026-05-20T10:00:00",
  status: "ENTREGADA",
  grade: null,
  feedback: null,
};

function createApi(overrides: Partial<StudentPortalApi> = {}): StudentPortalApi {
  return {
    getMe: vi.fn(async () => PROFILE),
    getDashboard: vi.fn(async () => DASHBOARD),
    getGrades: vi.fn(async () => GRADES),
    getActivities: vi.fn(async () => ACTIVITIES),
    getSubmissions: vi.fn(async () => SUBMISSIONS),
    getAttendance: vi.fn(async () => ({ percentage: 83, records: [] })),
    submitActivity: vi.fn(async () => SUBMISSION),
    ...overrides,
  };
}

/** Starts the in-memory session once the provider is mounted. */
function SessionBootstrap({ children }: { children: ReactNode }) {
  const { startSession } = useAuthSession();

  useEffect(() => {
    startSession(STUDENT_SESSION);
  }, [startSession]);

  return <>{children}</>;
}

function renderScreen(
  element: ReactNode,
  api: StudentPortalApi,
  options: { path?: string; pattern?: string } = {},
) {
  const path = options.path ?? "/estudiante";
  const pattern = options.pattern ?? path;

  return render(
    <AppProviders studentPortalApi={api}>
      <SessionBootstrap>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={pattern} element={element} />
          </Routes>
        </MemoryRouter>
      </SessionBootstrap>
    </AppProviders>,
  );
}

function renderActivityDetail(api: StudentPortalApi) {
  return renderScreen(<ActivityDetailPage />, api, {
    path: "/estudiante/actividades/7",
    pattern: "/estudiante/actividades/:activityId",
  });
}

describe("StudentDashboardPage", () => {
  it("renders the real metrics, the average state and the next delivery", async () => {
    const api = createApi();
    renderScreen(<StudentDashboardPage />, api);

    expect(await screen.findByRole("heading", { name: /hola, mariana/i })).toBeInTheDocument();
    expect(screen.getAllByText("4,5").length).toBeGreaterThan(0);
    expect(screen.getByText("83%")).toBeInTheDocument();
    expect(screen.getByText(/estado: definitivo/i)).toBeInTheDocument();
    expect(screen.getAllByText("Informe de ecosistemas").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /abrir actividad/i })).toHaveAttribute(
      "href",
      "/estudiante/actividades/7",
    );
    expect(api.getMe).toHaveBeenCalledWith("student-token");
    expect(api.getDashboard).toHaveBeenCalledWith("student-token");
  });

  it("shows an unavailable state without inventing average or attendance figures", async () => {
    const api = createApi({ getDashboard: vi.fn(async () => DASHBOARD_UNAVAILABLE) });
    renderScreen(<StudentDashboardPage />, api);

    expect(await screen.findByRole("heading", { name: /hola, mariana/i })).toBeInTheDocument();
    expect(screen.getAllByText(/no disponible/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("4,2")).not.toBeInTheDocument();
    expect(screen.queryByText("96%")).not.toBeInTheDocument();
  });

  it("shows the message of the ApiError contract when the dashboard fails", async () => {
    const api = createApi({
      getDashboard: vi.fn(async () => {
        throw new ApiError(500, "INTERNAL_ERROR", "The dashboard is unavailable.");
      }),
    });
    renderScreen(<StudentDashboardPage />, api);

    expect(await screen.findByRole("alert")).toHaveTextContent("The dashboard is unavailable.");
  });

  it("shows a loading state until the API answers", async () => {
    const api = createApi({
      getMe: vi.fn(() => new Promise<StudentProfile>(() => undefined)),
      getDashboard: vi.fn(() => new Promise<StudentDashboard>(() => undefined)),
    });
    renderScreen(<StudentDashboardPage />, api);

    expect(screen.getByLabelText(/cargando contenido/i)).toBeInTheDocument();
  });
});

describe("StudentGradesPage", () => {
  it("renders the general average and the breakdown by subject", async () => {
    const api = createApi();
    renderScreen(<StudentGradesPage />, api);

    expect(await screen.findByRole("heading", { name: /mis calificaciones/i })).toBeInTheDocument();
    expect(screen.getAllByText("Matemáticas").length).toBeGreaterThan(0);
    expect(screen.getByText("Parcial 1")).toBeInTheDocument();
    expect(screen.getByText("Buen trabajo.")).toBeInTheDocument();
    expect(screen.getByText("Taller de ecuaciones")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getAllByText("Ciencias Naturales").length).toBeGreaterThan(0);
    expect(api.getGrades).toHaveBeenCalledWith("student-token");
  });

  it("shows an empty state when the student has no grades", async () => {
    const api = createApi({
      getGrades: vi.fn(async () => ({
        generalAverage: null,
        averageStatus: "UNAVAILABLE" as const,
        subjects: [],
      })),
    });
    renderScreen(<StudentGradesPage />, api);

    expect(await screen.findByText(/sin calificaciones/i)).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the message of the ApiError contract when the grades fail", async () => {
    const api = createApi({
      getGrades: vi.fn(async () => {
        throw new ApiError(403, "ACCESS_DENIED", "The student session is required.");
      }),
    });
    renderScreen(<StudentGradesPage />, api);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The student session is required.",
    );
  });
});

describe("StudentActivitiesPage", () => {
  it("renders the published activities with their derived state", async () => {
    const api = createApi();
    renderScreen(<StudentActivitiesPage />, api);

    expect(await screen.findByRole("heading", { name: /mis actividades/i })).toBeInTheDocument();
    expect(screen.getByText("Informe de ecosistemas")).toBeInTheDocument();
    expect(screen.getByText("Ensayo: voces de la memoria")).toBeInTheDocument();
    expect(screen.getByText("3 actividades")).toBeInTheDocument();
    expect(screen.getAllByText("Calificada").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Entregada").length).toBeGreaterThan(0);
    expect(api.getActivities).toHaveBeenCalledWith("student-token");
  });

  it("shows an empty state when there are no published activities", async () => {
    const api = createApi({ getActivities: vi.fn(async () => ({ activities: [] })) });
    renderScreen(<StudentActivitiesPage />, api);

    expect(await screen.findByText(/sin actividades/i)).toBeInTheDocument();
  });
});

describe("ActivityDetailPage", () => {
  it("sends the delivery and confirms it", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderActivityDetail(api);

    expect(
      await screen.findByRole("heading", { name: "Informe de ecosistemas" }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: /respuesta/i }),
      "Adjunto mi informe final.",
    );
    await user.type(
      screen.getByRole("textbox", { name: /archivo de referencia/i }),
      "informe.pdf",
    );
    await user.click(screen.getByRole("button", { name: /enviar entrega/i }));

    await waitFor(() =>
      expect(api.submitActivity).toHaveBeenCalledWith(
        7,
        { contenido: "Adjunto mi informe final.", archivoRef: "informe.pdf" },
        "student-token",
      ),
    );
    expect(await screen.findByText(/actividad entregada/i)).toBeInTheDocument();
  });

  it("shows the 409 of a duplicated delivery", async () => {
    const user = userEvent.setup();
    const api = createApi({
      submitActivity: vi.fn(async () => {
        throw new ApiError(409, "SUBMISSION_ALREADY_EXISTS", "You already submitted this activity.");
      }),
    });
    renderActivityDetail(api);

    await screen.findByRole("heading", { name: "Informe de ecosistemas" });
    await user.type(screen.getByRole("textbox", { name: /respuesta/i }), "Otra entrega");
    await user.click(screen.getByRole("button", { name: /enviar entrega/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You already submitted this activity.",
    );
  });

  it("shows the 400 of an invalid delivery", async () => {
    const user = userEvent.setup();
    const api = createApi({
      submitActivity: vi.fn(async () => {
        throw new ApiError(400, "VALIDATION_ERROR", "The delivery is not valid.");
      }),
    });
    renderActivityDetail(api);

    await screen.findByRole("heading", { name: "Informe de ecosistemas" });
    await user.type(screen.getByRole("textbox", { name: /respuesta/i }), "Texto");
    await user.click(screen.getByRole("button", { name: /enviar entrega/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The delivery is not valid.");
  });

  it("shows an empty state when the activity does not exist", async () => {
    const api = createApi({ getActivities: vi.fn(async () => ({ activities: [] })) });
    renderActivityDetail(api);

    expect(await screen.findByText(/actividad no encontrada/i)).toBeInTheDocument();
  });
});

describe("StudentSubmissionsPage", () => {
  it("renders the delivery history with grades and feedback", async () => {
    const api = createApi();
    renderScreen(<StudentSubmissionsPage />, api);

    expect(await screen.findByRole("heading", { name: /mis entregas/i })).toBeInTheDocument();
    expect(screen.getByText("Ensayo: voces de la memoria")).toBeInTheDocument();
    expect(screen.getByText("Buena argumentación.")).toBeInTheDocument();
    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.getByText("Sin observaciones")).toBeInTheDocument();
    expect(api.getSubmissions).toHaveBeenCalledWith("student-token");
  });

  it("shows an empty state when there are no deliveries", async () => {
    const api = createApi({ getSubmissions: vi.fn(async () => ({ submissions: [] })) });
    renderScreen(<StudentSubmissionsPage />, api);

    expect(await screen.findByText(/sin entregas registradas/i)).toBeInTheDocument();
  });
});

describe("StudentProfilePage", () => {
  it("renders the identity and the active enrollment", async () => {
    const api = createApi();
    renderScreen(<StudentProfilePage />, api);

    expect(await screen.findByRole("heading", { name: /mi perfil/i })).toBeInTheDocument();
    expect(screen.getByText("Mariana Gómez")).toBeInTheDocument();
    expect(screen.getByText("1000000001", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getAllByText(/8°/).length).toBeGreaterThan(0);
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(api.getMe).toHaveBeenCalledWith("student-token");
  });

  it("shows the missing enrollment without inventing values", async () => {
    const api = createApi({
      getMe: vi.fn(async () => ({
        ...PROFILE,
        enrollment: { academicYear: null, grade: null, group: null, period: null },
      })),
    });
    renderScreen(<StudentProfilePage />, api);

    expect(await screen.findAllByText(/sin matrícula activa/i)).not.toHaveLength(0);
    expect(screen.getByText("Mariana Gómez")).toBeInTheDocument();
  });
});
