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
import type { FileMetadata } from "@/types/files";

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
  type: "TAREA",
};

const PUBLISHED: TeacherActivity = { ...DRAFT, status: "PUBLICADA" };

const IN_CLASS: TeacherActivity = {
  ...DRAFT,
  id: 8,
  title: "Trabajo en clase",
  status: "PUBLICADA",
  type: "ACTIVIDAD",
};

const ATTACHMENT: FileMetadata = {
  id: 10,
  nombreOriginal: "informe.pdf",
  mimeType: "application/pdf",
  tamanoBytes: 2048,
  creadoEn: "2026-05-20T10:00:00",
};

const SUBMISSIONS: ActivitySubmissions = {
  activity: { id: 7, title: "Informe de ecosistemas", dueDate: "2026-05-30", type: "TAREA" },
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
      files: [ATTACHMENT],
      gradedAt: null,
      gradedBy: null,
      gradedByName: null,
    },
  ],
};

/** Mariana delivered with an attachment; Juan is enrolled without a delivery row. */
const SUBMISSIONS_WITH_PENDING: ActivitySubmissions = {
  activity: SUBMISSIONS.activity,
  submissions: [
    SUBMISSIONS.submissions[0]!,
    {
      id: null,
      studentId: 2,
      studentName: "Juan Pérez",
      submittedAt: null,
      content: null,
      status: "PENDIENTE",
      grade: null,
      feedback: null,
      files: [],
      gradedAt: null,
      gradedBy: null,
      gradedByName: null,
    },
  ],
};

/** A delivery already graded, with its audit of date and author. */
const GRADED_SUBMISSIONS: ActivitySubmissions = {
  activity: SUBMISSIONS.activity,
  submissions: [
    {
      ...SUBMISSIONS.submissions[0]!,
      status: "CALIFICADA",
      grade: 4.5,
      feedback: "Buen trabajo",
      gradedAt: "2026-05-21T09:30:00",
      gradedBy: 9,
      gradedByName: "Raúl Docente",
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
    getActivityFiles: vi.fn(async () => [] as FileMetadata[]),
    uploadActivityFiles: vi.fn(async () => [] as FileMetadata[]),
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
    expect(api.getActivities).toHaveBeenCalledWith(1, "teacher-token", undefined);
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
          type: "TAREA",
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

  it("shows the pedagogical type of each activity as a badge", async () => {
    const api = createApi({
      getActivities: vi.fn(async () => ({
        assignmentId: 1,
        activities: [DRAFT, IN_CLASS],
      })),
    });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    expect(await screen.findByText("Taller de ecuaciones")).toBeInTheDocument();
    // The selector also renders the same words as options, so scope to the badges.
    expect(document.querySelector(".type-badge.type-tarea")).toHaveTextContent("Tarea");
    expect(document.querySelector(".type-badge.type-actividad")).toHaveTextContent("Actividad");
  });

  it("filters the activities by type through the API", async () => {
    const user = userEvent.setup();
    const api = createApi({
      getActivities: vi.fn(async (assignmentId: number, _token: string, type?: string) => ({
        assignmentId,
        activities: type === "ACTIVIDAD" ? [IN_CLASS] : [DRAFT, IN_CLASS],
      })),
    });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    expect(await screen.findByText("Taller de ecuaciones")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText(/filtrar las actividades por tipo/i),
      "ACTIVIDAD",
    );

    await waitFor(() =>
      expect(api.getActivities).toHaveBeenCalledWith(1, "teacher-token", "ACTIVIDAD"),
    );
    expect(await screen.findByText("Trabajo en clase")).toBeInTheDocument();
    expect(screen.queryByText("Taller de ecuaciones")).not.toBeInTheDocument();
  });

  it("asks the backend for the chosen type when the professor creates an activity", async () => {
    const user = userEvent.setup();
    const api = createApi({
      createActivity: vi.fn(async () => ({ ...DRAFT, type: "ACTIVIDAD" as const })),
    });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    await screen.findByText(/sin actividades/i);
    await user.click(screen.getByRole("button", { name: /crear actividad/i }));

    await user.selectOptions(screen.getByLabelText(/tipo de la actividad/i), "ACTIVIDAD");
    await user.type(screen.getByLabelText(/título/i), "Trabajo en clase");
    await user.type(screen.getByLabelText(/descripción e instrucciones/i), "En parejas");
    fireEvent.change(screen.getByLabelText(/fecha límite/i), {
      target: { value: "2026-05-31" },
    });
    await user.click(screen.getByRole("button", { name: /guardar borrador/i }));

    await waitFor(() =>
      expect(api.createActivity).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "Trabajo en clase", type: "ACTIVIDAD" }),
        "teacher-token",
      ),
    );
  });

  it("lists, previews and deletes the materials of an activity", async () => {
    const user = userEvent.setup();
    const material: FileMetadata = {
      id: 30,
      nombreOriginal: "apuntes.pdf",
      mimeType: "application/pdf",
      tamanoBytes: 1024,
      creadoEn: "2026-05-20T10:00:00",
    };
    const deleteActivityFile = vi.fn(async () => undefined);
    const api = createApi({
      getActivities: vi.fn(async () => ({ assignmentId: 1, activities: [DRAFT] })),
      getActivityFiles: vi.fn(async () => [material]),
      deleteActivityFile,
    });
    renderScreen(<TeacherActivitiesPage />, api, { path: "/profesor/actividades" });

    await user.click(await screen.findByRole("button", { name: /materiales/i }));

    expect(await screen.findByText("apuntes.pdf")).toBeInTheDocument();
    expect(api.getActivityFiles).toHaveBeenCalledWith(7, "teacher-token");

    await user.click(screen.getByRole("button", { name: /eliminar apuntes\.pdf/i }));

    await waitFor(() =>
      expect(deleteActivityFile).toHaveBeenCalledWith(7, 30, "teacher-token"),
    );
    expect(await screen.findByText(/sin materiales/i)).toBeInTheDocument();
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
    // The split view repeats the student and the state in the list and in the detail panel.
    expect(screen.getAllByText("Mariana Gómez").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Entregada").length).toBeGreaterThanOrEqual(1);
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

  it("shows every enrolled student, including those without a delivery", async () => {
    const user = userEvent.setup();
    const api = createApi({ getSubmissions: vi.fn(async () => SUBMISSIONS_WITH_PENDING) });
    renderScreen(<SubmissionsGradingPage />, api, options);

    expect(await screen.findByLabelText(/ver entrega de juan pérez/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/calificar a mariana gómez/i)).toBeInTheDocument();
    expect(screen.getByText("0 de 2 calificadas")).toBeInTheDocument();

    // Opening Juan (pending) shows no delivery and no grade form.
    await user.click(screen.getByLabelText(/ver entrega de juan pérez/i));
    expect(await screen.findByText(/este estudiante aún no ha entregado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/nota \(0,0 a 5,0\)/i)).not.toBeInTheDocument();
  });

  it("shows the audit of a graded delivery: date, author and grade", async () => {
    const api = createApi({ getSubmissions: vi.fn(async () => GRADED_SUBMISSIONS) });
    renderScreen(<SubmissionsGradingPage />, api, options);

    const audit = await screen.findByRole("note");
    expect(audit).toHaveTextContent(/calificada el/i);
    expect(audit).toHaveTextContent(/21 de may de 2026/i);
    expect(audit).toHaveTextContent("Raúl Docente");
    expect(audit).toHaveTextContent("4,5");
    expect(screen.getByText("1 de 1 calificadas")).toBeInTheDocument();
  });

  it("filters the list by state", async () => {
    const user = userEvent.setup();
    const api = createApi({ getSubmissions: vi.fn(async () => SUBMISSIONS_WITH_PENDING) });
    renderScreen(<SubmissionsGradingPage />, api, options);

    await screen.findByLabelText(/ver entrega de juan pérez/i);
    await user.selectOptions(
      screen.getByLabelText(/filtrar las entregas por estado/i),
      "PENDIENTE",
    );

    expect(await screen.findByLabelText(/ver entrega de juan pérez/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/calificar a mariana gómez/i)).not.toBeInTheDocument();
  });

  it("saves the grade and moves to the next delivery without leaving the screen", async () => {
    const user = userEvent.setup();
    const api = createApi({
      getSubmissions: vi.fn(async () => SUBMISSIONS_WITH_PENDING),
      gradeSubmission: vi.fn(async (submissionId: number) => ({
        ...SUBMISSIONS.submissions[0]!,
        id: submissionId,
        status: "CALIFICADA" as const,
        grade: 4.5,
        feedback: "Buen trabajo",
      })),
    });
    renderScreen(<SubmissionsGradingPage />, api, options);

    await user.click(await screen.findByLabelText(/calificar a mariana gómez/i));
    await user.type(screen.getByLabelText(/nota \(0,0 a 5,0\)/i), "4.5");
    await user.click(screen.getByRole("button", { name: /guardar y siguiente/i }));

    await waitFor(() =>
      expect(api.gradeSubmission).toHaveBeenCalledWith(
        1,
        { grade: 4.5 },
        "teacher-token",
      ),
    );
    // The focus advances to the next visible delivery (Juan, still pending).
    expect(await screen.findByText(/este estudiante aún no ha entregado/i)).toBeInTheDocument();
    expect(screen.queryByText(/calificación guardada/i)).not.toBeInTheDocument();
  });
});
