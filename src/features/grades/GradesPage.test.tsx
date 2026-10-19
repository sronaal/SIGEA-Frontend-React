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
    saveAttendance: vi.fn(),
    createActivity: vi.fn(),
    publishActivity: vi.fn(),
    getSubmissions: vi.fn(),
    gradeSubmission: vi.fn(),
    createAssessment: vi.fn(async () => ASSESSMENT),
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
    expect(api.getStudents).toHaveBeenCalledWith(1, "teacher-token");
    expect(screen.getByTestId("accumulated-weight")).toHaveTextContent("0%");
  });

  it("creates an assessment and shows its accumulated weight", async () => {
    const user = userEvent.setup();
    const api = createApi();
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

  it("records the grades of the group in the selected assessment", async () => {
    const user = userEvent.setup();
    const api = createApi();
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
  });

  it("rejects an out-of-range grade in the form", async () => {
    const user = userEvent.setup();
    const api = createApi();
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
