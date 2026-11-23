import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  FileBoard,
  MAX_FILES_PER_DELIVERY,
  formatFileSize,
  validateFiles,
} from "@/components/FileBoard";
import { ApiError } from "@/services/http";
import type { StudentPortalApi } from "@/services/studentPortal";
import type { AuthSession } from "@/types/auth";
import type { FileMetadata } from "@/types/files";

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

const ATTACHMENT: FileMetadata = {
  id: 42,
  nombreOriginal: "informe.pdf",
  mimeType: "application/pdf",
  tamanoBytes: 2048,
  creadoEn: "2026-05-20T10:00:00",
};

function createApi(overrides: Partial<StudentPortalApi> = {}): StudentPortalApi {
  return {
    getMe: vi.fn(),
    getDashboard: vi.fn(),
    getGrades: vi.fn(),
    getActivities: vi.fn(),
    getSubmissions: vi.fn(),
    getAttendance: vi.fn(),
    submitActivity: vi.fn(),
    resubmit: vi.fn(),
    uploadFiles: vi.fn(async () => [ATTACHMENT]),
    getFiles: vi.fn(async () => [ATTACHMENT]),
    deleteFile: vi.fn(async () => undefined),
    getFileBlob: vi.fn(async () => new Blob(["contenido"], { type: "application/pdf" })),
    ...overrides,
  };
}

function SessionBootstrap({ children }: { children: ReactNode }) {
  const { startSession } = useAuthSession();
  useEffect(() => {
    startSession(STUDENT_SESSION);
  }, [startSession]);
  return <>{children}</>;
}

function renderBoard(api: StudentPortalApi) {
  return render(
    <AppProviders studentPortalApi={api}>
      <SessionBootstrap>
        <FileBoard submissionId={7} />
      </SessionBootstrap>
    </AppProviders>,
  );
}

function pdf(name: string): File {
  return new File(["contenido"], name, { type: "application/pdf" });
}

describe("validateFiles", () => {
  it("accepts an academic document inside the delivery budget", () => {
    expect(validateFiles([pdf("informe.pdf")], 0)).toBeNull();
  });

  it("rejects a batch that would exceed the maximum of attachments", () => {
    const message = validateFiles([pdf("uno.pdf"), pdf("dos.pdf")], MAX_FILES_PER_DELIVERY - 1);
    expect(message).toContain(String(MAX_FILES_PER_DELIVERY));
  });

  it("rejects a type outside the academic document set", () => {
    const executable = new File(["binario"], "instalador.exe", { type: "application/x-msdownload" });
    expect(validateFiles([executable], 0)).toContain("instalador.exe");
  });

  it("rejects a file above ten megabytes and an empty one", () => {
    const oversized = new File(["x"], "pesado.pdf", { type: "application/pdf" });
    Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 });
    expect(validateFiles([oversized], 0)).toContain("10 MB");

    const empty = new File([], "vacio.pdf", { type: "application/pdf" });
    expect(validateFiles([empty], 0)).toContain("vacío");
  });
});

describe("formatFileSize", () => {
  it("renders bytes, kilobytes and megabytes in Spanish units", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("FileBoard", () => {
  it("lists the attachments of the delivery with their size", async () => {
    renderBoard(createApi());

    expect(await screen.findByText("informe.pdf")).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver informe.pdf" })).toBeInTheDocument();
    expect(screen.getByText("1 de 5 archivos adjuntos.")).toBeInTheDocument();
  });

  it("reports a load failure without breaking the board", async () => {
    const api = createApi({
      getFiles: vi.fn(async () => {
        throw new ApiError(404, "RESOURCE_NOT_FOUND", "The delivery was not found.");
      }),
    });
    renderBoard(api);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The delivery was not found.",
    );
  });

  it("uploads a whole batch in one request and refreshes the list", async () => {
    const api = createApi({ getFiles: vi.fn(async () => []) });
    const { container } = renderBoard(api);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, [pdf("uno.pdf"), pdf("dos.pdf")]);

    await waitFor(() => expect(api.uploadFiles).toHaveBeenCalledTimes(1));
    expect(api.uploadFiles).toHaveBeenCalledWith(
      7,
      [expect.objectContaining({ name: "uno.pdf" }), expect.objectContaining({ name: "dos.pdf" })],
      "student-token",
    );
    await waitFor(() => expect(api.getFiles).toHaveBeenCalledTimes(2));
  });

  it("refuses a forbidden type before reaching the API", async () => {
    const api = createApi();
    const { container } = renderBoard(api);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(
      input,
      [new File(["binario"], "instalador.exe", { type: "application/x-msdownload" })],
      { applyAccept: false },
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("no es un tipo permitido");
    expect(api.uploadFiles).not.toHaveBeenCalled();
  });

  it("removes an attachment through the API", async () => {
    const api = createApi();
    renderBoard(api);

    await userEvent.click(await screen.findByRole("button", { name: "Quitar informe.pdf" }));

    await waitFor(() => expect(api.deleteFile).toHaveBeenCalledWith(7, 42, "student-token"));
  });

  it("opens the preview dialog and fetches the bytes with the session token", async () => {
    const api = createApi();
    renderBoard(api);

    await userEvent.click(await screen.findByRole("button", { name: "Ver informe.pdf" }));

    expect(await screen.findByRole("dialog")).toHaveAccessibleName("Vista previa de informe.pdf");
    await waitFor(() => expect(api.getFileBlob).toHaveBeenCalledWith(42, "student-token", "preview"));
    expect(await screen.findByRole("button", { name: /Descargar/ })).toBeInTheDocument();
  });
});
