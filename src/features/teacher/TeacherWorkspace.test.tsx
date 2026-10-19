import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  SubmissionsGradingPage,
  TeacherActivitiesPage,
  TeacherGroupsPage,
} from "@/features/teacher/TeacherWorkspace";
import { ApiError } from "@/services/http";
import type { TeacherWorkspaceApi } from "@/services/teacherWorkspace";
import type {
  ActivitySubmissions,
  AssignmentStudents,
  TeacherActivity,
  TeacherAssignments,
  TeacherStudent,
} from "@/types/academic";
import type { AuthSession } from "@/types/auth";

const TEACHER_SESSION: AuthSession = {
  accessToken: "teacher-token",
  tokenType: "Bearer",
  scope: "TEACHER",
  role: "PROFESOR",
  expiresAt: "2026-10-19T22:00:00Z",
  user: {
    id: 2,
    nombres: "Andrés",
    apellidos: "Rodríguez",
    correo: "andres.rodriguez@sigea.local",
    rol: "PROFESOR",
    estudianteId: null,
  },
};

const ASSIGNMENTS: TeacherAssignments = {
  assignments: [
    {
      id: 1,
      subject: "Matemáticas",
      grade: "8",
      group: "A",
      academicYear: 2026,
      period: 2,
      studentCount: 32,
    },
    {
      id: 2,
      subject: "Física",
      grade: "10",
      group: "A",
      academicYear: 2026,
      period: 2,
      studentCount: 34,
    },
  ],
};

const STUDENTS: TeacherStudent[] = [
  {
    id: 1,
    nombres: "Mariana",
    apellidos: "Gómez",
    tipoDocumento: "TARJETA_IDENTIDAD",
    numeroDocumento: "1000000001",
    average: 4.5,
    averageStatus: "DEFINITIVE",
    attendancePercentage: 83,
  },
  {
    id: 2,
    nombres: "Juan",
    apellidos: "Pérez",
    tipoDocumento: "TARJETA_IDENTIDAD",
    numeroDocumento: "1000000002",
    average: null,
    averageStatus: "UNAVAILABLE",
    attendancePercentage: null,
  },
];

const STUDENT_LIST: AssignmentStudents = {
  assignment: { id: 1, subject: "Matemáticas", grade: "8", group: "A", academicYear: 2026 },
  students: STUDENTS,
};

const STUDENT_LIST_PHYSICS: AssignmentStudents = {
  assignment: { id: 2, subject: "Física", grade: "10", group: "A", academicYear: 2026 },
  students: [STUDENTS[0]!],
};

const DRAFT: TeacherActivity = {
  id: 7,
  title: "Taller de ecuaciones",
  description: "Resuelve los ejercicios propuestos.",
  dueDate: "2026-05-30",
  status: "BORRADOR",
};

const PUBLISHED: TeacherActivity = { ...DRAFT, status: "PUBLICADA" };

const SUBMISSIONS: ActivitySubmissions = {
  activity: { id: 7, title: "Informe de ecosistemas", dueDate: "2026-05-30" },
  submissions: [
    {
      id: 1,
      studentId: 1,
      studentName: "Mariana Gómez",
      submittedAt: "2026-05-20T10:00:00",
      content: "Adjunto mi informe final.",
      status: "ENTREGADA",
      grade: null,
      feedback: null,
    },
  ],
};

function createApi(overrides: Partial<TeacherWorkspaceApi> = {}): TeacherWorkspaceApi {
  return {
    getAssignments: vi.fn(async () => ASSIGNMENTS),
    getStudents: vi.fn(async () => STUDENT_LIST),
    getAttendance: vi.fn(),
    getActivities: vi.fn(async (assignmentId: number) => ({
      assignmentId,
      activities: [] as TeacherActivity[],
    })),
    saveAttendance: vi.fn(),
    createActivity: vi.fn(async () => DRAFT),
    publishActivity: vi.fn(async () => PUBLISHED),
    getSubmissions: vi.fn(async () => SUBMISSIONS),
    gradeSubmission: vi.fn(async () => ({
      ...SUBMISSIONS.submissions[0]!,
      status: "CALIFICADA" as const,
      grade: 4.5,
      feedback: "Buen trabajo",
    })),
    createAssessment: vi.fn(),
    getAssessments: vi.fn(async (assignmentId: number) => ({
      assignmentId,
      accumulatedWeight: 0,
      assessments: [],
    })),
    getAssessmentGrades: vi.fn(async (assessmentId: number) => ({
      assessmentId,
      records: [],
    })),
    saveGrades: vi.fn(),
    ...overrides,
  };
}

function SessionBootstrap({ children }: { children: ReactNode }) {
  const { startSession } = useAuthSession();

  useEffect(() => {
    startSession(TEACHER_SESSION);
  }, [startSession]);

  return <>{children}</>;
}

function renderScreen(
  element: ReactNode,
  api: TeacherWorkspaceApi,
  options: { path?: string; pattern?: string } = {},
) {
  const path = options.path ?? "/profesor/grupos";
  const pattern = options.pattern ?? path;

  return render(
    <AppProviders teacherWorkspaceApi={api}>
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

describe("TeacherGroupsPage", () => {
  it("renders the students of the selected assignment with their metrics", async () => {
    const api = createApi();
    renderScreen(<TeacherGroupsPage />, api);

    expect(
      await screen.findByRole("heading", { name: /mis grupos y asignaturas/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Mariana Gómez")).toBeInTheDocument();
    expect(screen.getByText("1000000001")).toBeInTheDocument();
    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.getByText("83%")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(api.getStudents).toHaveBeenCalledWith(1, "teacher-token");
  });

  it("loads the students of another assignment when the professor selects it", async () => {
    const user = userEvent.setup();
    const api = createApi({
      getStudents: vi.fn(async (assignmentId: number) =>
        assignmentId === 2 ? STUDENT_LIST_PHYSICS : STUDENT_LIST,
      ),
    });
    renderScreen(<TeacherGroupsPage />, api);

    await screen.findByText("Mariana Gómez");
    await user.click(screen.getByRole("button", { name: /física/i }));

    await waitFor(() => expect(api.getStudents).toHaveBeenCalledWith(2, "teacher-token"));
    expect(await screen.findByText("Física · 10° A")).toBeInTheDocument();
  });

  it("shows an empty state when the assignment has no students", async () => {
    const api = createApi({
      getStudents: vi.fn(async () => ({ assignment: STUDENT_LIST.assignment, students: [] })),
    });
    renderScreen(<TeacherGroupsPage />, api);

    expect(await screen.findByText(/sin estudiantes/i)).toBeInTheDocument();
  });

  it("shows the message of the ApiError contract when the assignments fail", async () => {
    const api = createApi({
      getAssignments: vi.fn(async () => {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "The assignment was not found.");
      }),
    });
    renderScreen(<TeacherGroupsPage />, api);

    expect(await screen.findByRole("alert")).toHaveTextContent("The assignment was not found.");
  });
});

describe("TeacherActivitiesPage", () => {
  it("renders the activities returned by the API", async () => {
    const api = createApi({
      getActivities: vi.fn(async () => ({ assignmentId: 1, activities: [DRAFT] })),
    });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    expect(await screen.findByText("Taller de ecuaciones")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(api.getActivities).toHaveBeenCalledWith(1, "teacher-token");
  });

  it("starts with an empty list and refreshes it after creating a draft", async () => {
    const user = userEvent.setup();
    const getActivities = vi
      .fn()
      .mockResolvedValueOnce({ assignmentId: 1, activities: [] })
      .mockResolvedValueOnce({ assignmentId: 1, activities: [DRAFT] });
    const api = createApi({ getActivities });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    expect(await screen.findByText(/sin actividades/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /crear actividad/i }));

    await user.type(screen.getByLabelText(/título/i), "Taller de ecuaciones");
    await user.type(
      screen.getByLabelText(/descripción e instrucciones/i),
      "Resuelve los ejercicios propuestos.",
    );
    fireEvent.change(screen.getByLabelText(/fecha límite/i), {
      target: { value: "2026-05-30" },
    });
    await user.click(screen.getByRole("button", { name: /guardar borrador/i }));

    await waitFor(() =>
      expect(api.createActivity).toHaveBeenCalledWith(
        1,
        {
          title: "Taller de ecuaciones",
          description: "Resuelve los ejercicios propuestos.",
          dueDate: "2026-05-30",
          status: "BORRADOR",
        },
        "teacher-token",
      ),
    );
    expect(await screen.findByText(/actividad guardada como borrador/i)).toBeInTheDocument();
    expect(await screen.findByText("Taller de ecuaciones")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(getActivities).toHaveBeenCalledTimes(2);
  });

  it("publishes a draft and refreshes the list from the API", async () => {
    const user = userEvent.setup();
    const getActivities = vi
      .fn()
      .mockResolvedValueOnce({ assignmentId: 1, activities: [] })
      .mockResolvedValueOnce({ assignmentId: 1, activities: [DRAFT] })
      .mockResolvedValueOnce({ assignmentId: 1, activities: [PUBLISHED] });
    const api = createApi({ getActivities });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    await screen.findByText(/sin actividades/i);
    await user.click(screen.getByRole("button", { name: /crear actividad/i }));
    await user.type(screen.getByLabelText(/título/i), "Taller de ecuaciones");
    await user.type(screen.getByLabelText(/descripción e instrucciones/i), "Instrucciones");
    fireEvent.change(screen.getByLabelText(/fecha límite/i), {
      target: { value: "2026-05-30" },
    });
    await user.click(screen.getByRole("button", { name: /guardar borrador/i }));

    await screen.findByText("Taller de ecuaciones");
    await user.click(screen.getByRole("button", { name: /publicar/i }));

    await waitFor(() => expect(api.publishActivity).toHaveBeenCalledWith(7, "teacher-token"));
    expect(await screen.findByText(/actividad publicada correctamente/i)).toBeInTheDocument();
    expect(screen.getByText("Publicada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver entregas/i })).toHaveAttribute(
      "href",
      "/profesor/actividades/7/entregas",
    );
    expect(getActivities).toHaveBeenCalledTimes(3);
  });

  it("shows the message of the API when the creation fails", async () => {
    const user = userEvent.setup();
    const api = createApi({
      createActivity: vi.fn(async () => {
        throw new ApiError(400, "VALIDATION_ERROR", "The due date is required.");
      }),
    });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    await screen.findByText(/sin actividades/i);
    await user.click(screen.getByRole("button", { name: /crear actividad/i }));
    await user.type(screen.getByLabelText(/título/i), "Taller");
    await user.type(screen.getByLabelText(/descripción e instrucciones/i), "Instrucciones");
    fireEvent.change(screen.getByLabelText(/fecha límite/i), {
      target: { value: "2026-05-30" },
    });
    await user.click(screen.getByRole("button", { name: /publicar actividad/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The due date is required.");
  });
});

describe("SubmissionsGradingPage", () => {
  const options = {
    path: "/profesor/actividades/7/entregas",
    pattern: "/profesor/actividades/:activityId/entregas",
  };

  it("renders the deliveries of the activity", async () => {
    const api = createApi();
    renderScreen(<SubmissionsGradingPage />, api, options);

    expect(
      await screen.findByRole("heading", { name: /entregas: informe de ecosistemas/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mariana Gómez")).toBeInTheDocument();
    expect(screen.getByText("Entregada")).toBeInTheDocument();
    expect(api.getSubmissions).toHaveBeenCalledWith(7, "teacher-token");
  });

  it("grades a delivery with its feedback", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderScreen(<SubmissionsGradingPage />, api, options);

    await screen.findByRole("heading", { name: /entregas: informe de ecosistemas/i });
    await user.click(screen.getByRole("button", { name: /calificar/i }));
    await user.type(screen.getByLabelText(/nota \(0,0 a 5,0\)/i), "4.5");
    await user.type(screen.getByLabelText(/retroalimentación/i), "Buen trabajo");
    await user.click(screen.getByRole("button", { name: /guardar calificación/i }));

    await waitFor(() =>
      expect(api.gradeSubmission).toHaveBeenCalledWith(
        1,
        { grade: 4.5, feedback: "Buen trabajo" },
        "teacher-token",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/calificación guardada/i);
  });

  it("rejects a grade with more than one decimal before calling the API", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderScreen(<SubmissionsGradingPage />, api, options);

    await screen.findByRole("heading", { name: /entregas: informe de ecosistemas/i });
    await user.click(screen.getByRole("button", { name: /calificar/i }));
    await user.type(screen.getByLabelText(/nota \(0,0 a 5,0\)/i), "4.55");
    await user.click(screen.getByRole("button", { name: /guardar calificación/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/una sola cifra decimal/i);
    expect(api.gradeSubmission).not.toHaveBeenCalled();
  });

  it("shows the 400 of an invalid grade", async () => {
    const user = userEvent.setup();
    const api = createApi({
      gradeSubmission: vi.fn(async () => {
        throw new ApiError(400, "VALIDATION_ERROR", "The grade is not valid.");
      }),
    });
    renderScreen(<SubmissionsGradingPage />, api, options);

    await screen.findByRole("heading", { name: /entregas: informe de ecosistemas/i });
    await user.click(screen.getByRole("button", { name: /calificar/i }));
    await user.type(screen.getByLabelText(/nota \(0,0 a 5,0\)/i), "4.5");
    await user.click(screen.getByRole("button", { name: /guardar calificación/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The grade is not valid.");
  });

  it("shows an empty state when the activity has no deliveries", async () => {
    const api = createApi({
      getSubmissions: vi.fn(async () => ({
        activity: SUBMISSIONS.activity,
        submissions: [],
      })),
    });
    renderScreen(<SubmissionsGradingPage />, api, options);

    expect(await screen.findByText(/sin entregas/i)).toBeInTheDocument();
  });

  it("shows the message of the ApiError contract when the deliveries fail", async () => {
    const api = createApi({
      getSubmissions: vi.fn(async () => {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "The activity was not found.");
      }),
    });
    renderScreen(<SubmissionsGradingPage />, api, options);

    expect(await screen.findByRole("alert")).toHaveTextContent("The activity was not found.");
  });
});
