import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { useAuthSession } from "@/context/AuthSessionContext";
import { AttendancePage, TeacherDashboardPage } from "@/features/teacher/TeacherPages";
import { ApiError } from "@/services/http";
import type { TeacherWorkspaceApi } from "@/services/teacherWorkspace";
import type {
  AssignmentStudents,
  TeacherAttendance,
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

const ATTENDANCE: TeacherAttendance = {
  assignmentId: 1,
  date: "2026-05-28",
  records: [{ studentId: 1, status: "AUSENTE" }],
};

function createApi(overrides: Partial<TeacherWorkspaceApi> = {}): TeacherWorkspaceApi {
  return {
    getAssignments: vi.fn(async () => ASSIGNMENTS),
    getStudents: vi.fn(async () => STUDENT_LIST),
    getAttendance: vi.fn(async () => ATTENDANCE),
    getActivities: vi.fn(async (assignmentId: number) => ({ assignmentId, activities: [] })),
    saveAttendance: vi.fn(async () => ATTENDANCE),
    createActivity: vi.fn(),
    publishActivity: vi.fn(),
    getSubmissions: vi.fn(),
    gradeSubmission: vi.fn(),
    getActivityFiles: vi.fn(async () => []),
    uploadActivityFiles: vi.fn(async () => []),
    deleteActivityFile: vi.fn(),
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

function SessionBootstrap({
  children,
  session = TEACHER_SESSION,
}: {
  children: ReactNode;
  session?: AuthSession;
}) {
  const { startSession } = useAuthSession();

  useEffect(() => {
    startSession(session);
  }, [session, startSession]);

  return <>{children}</>;
}

function renderScreen(
  element: ReactNode,
  api: TeacherWorkspaceApi,
  session: AuthSession = TEACHER_SESSION,
) {
  return render(
    <AppProviders teacherWorkspaceApi={api}>
      <SessionBootstrap session={session}>
        <MemoryRouter initialEntries={["/profesor/asistencia"]}>
          <Routes>
            <Route path="*" element={element} />
          </Routes>
        </MemoryRouter>
      </SessionBootstrap>
    </AppProviders>,
  );
}

describe("TeacherDashboardPage", () => {
  it("renders the real assignments of the professor", async () => {
    const api = createApi();
    renderScreen(<TeacherDashboardPage />, api);

    expect(await screen.findByRole("heading", { name: /hola, andrés/i })).toBeInTheDocument();
    expect(screen.getAllByText("Matemáticas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Física").length).toBeGreaterThan(0);
    expect(screen.getAllByText("32").length).toBeGreaterThan(0);
    expect(screen.getAllByText("34").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026").length).toBeGreaterThan(0);
    expect(screen.getByText(/período 2/i)).toBeInTheDocument();
    expect(api.getAssignments).toHaveBeenCalledWith("teacher-token");
  });

  it("falls back to the session email when the name is missing", async () => {
    const session: AuthSession = {
      ...TEACHER_SESSION,
      user: { ...TEACHER_SESSION.user, nombres: null as unknown as string },
    };
    renderScreen(<TeacherDashboardPage />, createApi(), session);

    expect(
      await screen.findByRole("heading", {
        name: "Hola, andres.rodriguez@sigea.local",
      }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when the professor has no assignments", async () => {
    const api = createApi({ getAssignments: vi.fn(async () => ({ assignments: [] })) });
    renderScreen(<TeacherDashboardPage />, api);

    expect(await screen.findByRole("heading", { name: "Sin asignaciones" })).toBeInTheDocument();
  });

  it("shows the message of the ApiError contract when the assignments fail", async () => {
    const api = createApi({
      getAssignments: vi.fn(async () => {
        throw new ApiError(403, "ACCESS_DENIED", "The teacher scope is required.");
      }),
    });
    renderScreen(<TeacherDashboardPage />, api);

    expect(await screen.findByRole("alert")).toHaveTextContent("The teacher scope is required.");
  });

  it("shows a loading state until the API answers", () => {
    const api = createApi({
      getAssignments: vi.fn(() => new Promise<TeacherAssignments>(() => undefined)),
    });
    renderScreen(<TeacherDashboardPage />, api);

    expect(screen.getByLabelText(/cargando contenido/i)).toBeInTheDocument();
  });
});

describe("AttendancePage", () => {
  it("loads the students and only the records returned by the API", async () => {
    const api = createApi();
    renderScreen(<AttendancePage />, api);

    expect(await screen.findByRole("heading", { name: /^asistencia$/i })).toBeInTheDocument();
    expect(await screen.findByText("Mariana Gómez")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(api.getStudents).toHaveBeenCalledWith(1, "teacher-token");
    expect(api.getAttendance).toHaveBeenCalledWith(1, expect.any(String), "teacher-token");

    const absent = screen.getByRole("button", { name: /ausente/i, pressed: true });
    expect(absent).toBeInTheDocument();

    const juan = screen.getByRole("group", { name: /asistencia de juan pérez/i });
    expect(within(juan).queryByRole("button", { pressed: true })).not.toBeInTheDocument();
    expect(screen.getByTestId("attendance-count-PRESENTE")).toHaveTextContent("0");
    expect(screen.getByTestId("attendance-count-AUSENTE")).toHaveTextContent("1");
    expect(screen.getByTestId("attendance-count-unmarked")).toHaveTextContent("1");
    expect(screen.getByText("Sin registrar")).toBeInTheDocument();
  });

  it("saves only the students with an explicitly marked state", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderScreen(<AttendancePage />, api);

    await screen.findByText("Mariana Gómez");
    await user.click(screen.getByRole("button", { name: /guardar asistencia/i }));

    await waitFor(() =>
      expect(api.saveAttendance).toHaveBeenCalledWith(
        1,
        {
          date: expect.any(String),
          records: [{ studentId: 1, status: "AUSENTE" }],
        },
        "teacher-token",
      ),
    );
  });

  it("disables saving when no student has a marked state", async () => {
    const api = createApi({
      getAttendance: vi.fn(async () => ({
        assignmentId: 1,
        date: "2026-05-28",
        records: [],
      })),
    });
    renderScreen(<AttendancePage />, api);

    await screen.findByText("Mariana Gómez");
    const juan = screen.getByRole("group", { name: /asistencia de juan pérez/i });
    expect(within(juan).queryByRole("button", { pressed: true })).not.toBeInTheDocument();
    expect(screen.getByTestId("attendance-count-PRESENTE")).toHaveTextContent("0");
    expect(screen.getByTestId("attendance-count-unmarked")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /guardar asistencia/i })).toBeDisabled();
  });

  it("marks everyone present, saves the batch and confirms it", async () => {
    const user = userEvent.setup();
    const api = createApi();
    renderScreen(<AttendancePage />, api);

    await screen.findByText("Mariana Gómez");
    fireEvent.change(screen.getByLabelText(/fecha de la sesión/i), {
      target: { value: "2026-05-28" },
    });

    await user.click(screen.getByRole("button", { name: /marcar todos presentes/i }));
    await user.click(screen.getByRole("button", { name: /guardar asistencia/i }));

    await waitFor(() =>
      expect(api.saveAttendance).toHaveBeenCalledWith(
        1,
        {
          date: "2026-05-28",
          records: [
            { studentId: 1, status: "PRESENTE" },
            { studentId: 2, status: "PRESENTE" },
          ],
        },
        "teacher-token",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/asistencia guardada/i);
  });

  it("shows the 409 of an unenrolled student", async () => {
    const user = userEvent.setup();
    const api = createApi({
      saveAttendance: vi.fn(async () => {
        throw new ApiError(409, "STUDENT_NOT_ENROLLED", "The student is not enrolled in the group.");
      }),
    });
    renderScreen(<AttendancePage />, api);

    await screen.findByText("Mariana Gómez");
    await user.click(screen.getByRole("button", { name: /guardar asistencia/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The student is not enrolled in the group.",
    );
  });

  it("shows an empty state when the assignment has no students", async () => {
    const api = createApi({
      getStudents: vi.fn(async () => ({
        assignment: STUDENT_LIST.assignment,
        students: [],
      })),
    });
    renderScreen(<AttendancePage />, api);

    expect(await screen.findByText(/sin estudiantes/i)).toBeInTheDocument();
  });

  it("shows the message of the ApiError contract when the assignments fail", async () => {
    const api = createApi({
      getAssignments: vi.fn(async () => {
        throw new ApiError(500, "INTERNAL_ERROR", "The assignments are unavailable.");
      }),
    });
    renderScreen(<AttendancePage />, api);

    expect(await screen.findByRole("alert")).toHaveTextContent("The assignments are unavailable.");
  });
});
