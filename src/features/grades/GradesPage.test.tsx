import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { useAuthSession } from "@/context/AuthSessionContext";
import GradesPage from "@/features/grades/GradesPage";
import { ApiError } from "@/services/http";
import type { TeacherWorkspaceApi } from "@/services/teacherWorkspace";
import type {
  AssignmentStudents,
  TeacherAssessment,
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
      studentCount: 2,
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

const ASSESSMENT: TeacherAssessment = {
  id: 10,
  name: "Parcial de álgebra",
  weight: 40,
  period: 2,
  active: true,
};

function createApi(overrides: Partial<TeacherWorkspaceApi> = {}): TeacherWorkspaceApi {
  return {
    getAssignments: vi.fn(async () => ASSIGNMENTS),
    getStudents: vi.fn(async () => STUDENT_LIST),
    getAttendance: vi.fn(),
    getActivities: vi.fn(async (assignmentId: number) => ({ assignmentId, activities: [] })),
    saveAttendance: vi.fn(),
    createActivity: vi.fn(),
    publishActivity: vi.fn(),
    getSubmissions: vi.fn(),
    gradeSubmission: vi.fn(),
    getActivityFiles: vi.fn(async () => []),
    uploadActivityFiles: vi.fn(async () => []),
    deleteActivityFile: vi.fn(),
    createAssessment: vi.fn(async () => ASSESSMENT),
    getAssessments: vi.fn(async (assignmentId: number) => ({
      assignmentId,
      accumulatedWeight: 0,
      assessments: [] as TeacherAssessment[],
    })),
    getAssessmentGrades: vi.fn(async (assessmentId: number) => ({
      assessmentId,
      records: [] as Array<{ studentId: number; studentName: string; grade: number | null }>,
    })),
    saveGrades: vi.fn(async () => ({
      assessmentId: ASSESSMENT.id,
      grades: [
        { id: 1, studentId: 1, grade: 4.5 },
        { id: 2, studentId: 2, grade: 3 },
      ],
    })),
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

function renderGrades(api: TeacherWorkspaceApi) {
  return render(
    <AppProviders teacherWorkspaceApi={api}>
      <SessionBootstrap>
        <MemoryRouter initialEntries={["/profesor/calificaciones"]}>
          <Routes>
            <Route path="/profesor/calificaciones" element={<GradesPage />} />
          </Routes>
        </MemoryRouter>
      </SessionBootstrap>
    </AppProviders>,
  );
}

async function createAssessment(
  user: ReturnType<typeof userEvent.setup>,
  values: { name?: string; weight?: string; period?: string } = {},
) {
  await user.click(screen.getByRole("button", { name: /crear evaluación/i }));
  await user.type(
    screen.getByLabelText(/nombre/i),
    values.name ?? "Parcial de álgebra",
  );
  await user.type(screen.getByLabelText(/ponderación \(%\)/i), values.weight ?? "40");
  await user.type(screen.getByLabelText(/^período$/i), values.period ?? "2");
  const drawer = screen.getByRole("complementary", { name: "Crear evaluación" });
  await user.click(within(drawer).getByRole("button", { name: /^crear evaluación$/i }));
}

describe("GradesPage", () => {
  it("loads the group and explains that there are no assessments yet", async () => {
    const api = createApi();
    renderGrades(api);

    expect(
      await screen.findByRole("heading", { name: /calificaciones del grupo/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Mariana Gómez")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Sin evaluaciones" })).toBeInTheDocument();
    expect(screen.getByText(/no tiene evaluaciones registradas/i)).toBeInTheDocument();
    expect(screen.queryByText(/en esta sesión/i)).not.toBeInTheDocument();
    expect(api.getStudents).toHaveBeenCalledWith(1, "teacher-token");
    expect(api.getAssessments).toHaveBeenCalledWith(1, "teacher-token");
    expect(screen.getByTestId("accumulated-weight")).toHaveTextContent("0%");
  });

  it("shows the accumulated weight returned by the API, not a local sum", async () => {
    const api = createApi({
      getAssessments: vi.fn(async () => ({
        assignmentId: 1,
        accumulatedWeight: 55,
        assessments: [ASSESSMENT],
      })),
    });
    renderGrades(api);

    await screen.findByText("Mariana Gómez");
    expect(await screen.findByTestId("accumulated-weight")).toHaveTextContent("55%");
    expect(screen.getAllByText(/parcial de álgebra/i).length).toBeGreaterThan(0);
  });

  it("prefills the grades returned by the API for the selected assessment", async () => {
    const user = userEvent.setup();
    const api = createApi({
      getAssessments: vi.fn(async () => ({
        assignmentId: 1,
        accumulatedWeight: 40,
        assessments: [ASSESSMENT],
      })),
      getAssessmentGrades: vi.fn(async () => ({
        assessmentId: ASSESSMENT.id,
        records: [
          { studentId: 1, studentName: "Mariana Gómez", grade: 4.5 },
          { studentId: 2, studentName: "Juan Pérez", grade: null },
        ],
      })),
    });
    renderGrades(api);

    await screen.findByText("Mariana Gómez");
    await user.selectOptions(screen.getByLabelText("Evaluación"), String(ASSESSMENT.id));

    await waitFor(() =>
      expect(api.getAssessmentGrades).toHaveBeenCalledWith(10, "teacher-token"),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/calificación de mariana gómez/i)).toHaveValue(4.5),
    );
    expect(screen.getByLabelText(/calificación de juan pérez/i)).toHaveValue(null);
  });

  it("creates an assessment and refreshes its accumulated weight from the API", async () => {
    const user = userEvent.setup();
    const getAssessments = vi
      .fn()
      .mockResolvedValueOnce({ assignmentId: 1, accumulatedWeight: 0, assessments: [] })
      .mockResolvedValueOnce({
        assignmentId: 1,
        accumulatedWeight: 40,
        assessments: [ASSESSMENT],
      });
    const api = createApi({ getAssessments });
    renderGrades(api);

    await screen.findByText("Mariana Gómez");
    await createAssessment(user);

    await waitFor(() =>
      expect(api.createAssessment).toHaveBeenCalledWith(
        1,
        { name: "Parcial de álgebra", weight: 40, period: 2 },
        "teacher-token",
      ),
    );
    expect(await screen.findByTestId("accumulated-weight")).toHaveTextContent("40%");
    expect(screen.getAllByText(/parcial de álgebra/i).length).toBeGreaterThan(0);
    expect(getAssessments).toHaveBeenCalledTimes(2);
  });

  it("shows the 409 of the weight limit", async () => {
    const user = userEvent.setup();
    const api = createApi({
      createAssessment: vi.fn(async () => {
        throw new ApiError(
          409,
          "WEIGHT_LIMIT_EXCEEDED",
          "The active weight of the assignment cannot exceed 100 percent.",
        );
      }),
    });
    renderGrades(api);

    await screen.findByText("Mariana Gómez");
    await createAssessment(user, { weight: "90" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The active weight of the assignment cannot exceed 100 percent.",
    );
  });

  it("records the grades of the group and refreshes them from the API", async () => {
    const user = userEvent.setup();
    const getAssessments = vi
      .fn()
      .mockResolvedValueOnce({ assignmentId: 1, accumulatedWeight: 0, assessments: [] })
      .mockResolvedValue({
        assignmentId: 1,
        accumulatedWeight: 40,
        assessments: [ASSESSMENT],
      });
    const getAssessmentGrades = vi
      .fn()
      .mockResolvedValueOnce({ assessmentId: ASSESSMENT.id, records: [] })
      .mockResolvedValueOnce({
        assessmentId: ASSESSMENT.id,
        records: [
          { studentId: 1, studentName: "Mariana Gómez", grade: 4.8 },
          { studentId: 2, studentName: "Juan Pérez", grade: 3 },
        ],
      });
    const api = createApi({ getAssessments, getAssessmentGrades });
    renderGrades(api);

    await screen.findByText("Mariana Gómez");
    await createAssessment(user);
    await screen.findByTestId("accumulated-weight");

    await user.type(screen.getByLabelText(/calificación de mariana gómez/i), "4.5");
    await user.type(screen.getByLabelText(/calificación de juan pérez/i), "3.0");
    await user.click(screen.getByRole("button", { name: /guardar notas/i }));

    await waitFor(() =>
      expect(api.saveGrades).toHaveBeenCalledWith(
        10,
        {
          records: [
            { studentId: 1, grade: 4.5 },
            { studentId: 2, grade: 3 },
          ],
        },
        "teacher-token",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/notas guardadas/i);
    await waitFor(() =>
      expect(screen.getByLabelText(/calificación de mariana gómez/i)).toHaveValue(4.8),
    );
    expect(getAssessmentGrades).toHaveBeenCalledTimes(2);
  });

  it("rejects an out-of-range grade in the form", async () => {
    const user = userEvent.setup();
    const getAssessments = vi
      .fn()
      .mockResolvedValueOnce({ assignmentId: 1, accumulatedWeight: 0, assessments: [] })
      .mockResolvedValue({
        assignmentId: 1,
        accumulatedWeight: 40,
        assessments: [ASSESSMENT],
      });
    const api = createApi({ getAssessments });
    renderGrades(api);

    await screen.findByText("Mariana Gómez");
    await createAssessment(user);
    await screen.findByTestId("accumulated-weight");

    await user.type(screen.getByLabelText(/calificación de mariana gómez/i), "6");

    expect(await screen.findByText(/la nota debe estar entre 0,0 y 5,0/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar notas/i })).toBeDisabled();
    expect(api.saveGrades).not.toHaveBeenCalled();
  });

  it("shows the message of the ApiError contract when the group fails to load", async () => {
    const api = createApi({
      getAssignments: vi.fn(async () => {
        throw new ApiError(403, "ACCESS_DENIED", "The teacher scope is required.");
      }),
    });
    renderGrades(api);

    expect(await screen.findByRole("alert")).toHaveTextContent("The teacher scope is required.");
  });
});
