import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { AlertCircle, CheckCircle2, Eye, FileText, Loader2, Trash2, Upload } from "lucide-react";

import { useStudentPortalApi } from "@/app/providers";
import { useAuthSession } from "@/context/AuthSessionContext";
import { Button } from "@/components/ui";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { errorMessage } from "@/lib/format";
import type { FileMetadata } from "@/types/files";

/** Maximum number of attachments allowed per delivery. */
export const MAX_FILES_PER_DELIVERY = 5;

/** Maximum size allowed for a single attachment (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Extensions accepted by the backend storage contract. */
export const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg"] as const;

type FileBoardProps = {
  /** Identifier of the delivery that owns the attachments. */
  submissionId: number;
  /** Called after a successful upload with the refreshed attachment list. */
  onFilesChanged?: (files: FileMetadata[]) => void;
};

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1).toLowerCase();
}

/** Validates the candidate files against the delivery attachment rules. */
export function validateFiles(
  candidates: File[],
  currentCount: number,
): string | null {
  if (currentCount + candidates.length > MAX_FILES_PER_DELIVERY) {
    return `Puedes adjuntar máximo ${MAX_FILES_PER_DELIVERY} archivos por entrega.`;
  }
  for (const file of candidates) {
    if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name) as (typeof ALLOWED_EXTENSIONS)[number])) {
      return `"${file.name}" no es un tipo permitido (${ALLOWED_EXTENSIONS.join(", ")}).`;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `"${file.name}" supera el límite de 10 MB.`;
    }
    if (file.size === 0) {
      return `"${file.name}" está vacío.`;
    }
  }
  return null;
}

/** Human readable size. */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

/**
 * Upload board for the attachments of a student delivery.
 *
 * The board only renders once the delivery exists, because the attachment endpoints are keyed by
 * `submissionId`.
 */
export function FileBoard({ submissionId, onFilesChanged }: FileBoardProps) {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    const result = await api.getFiles(submissionId, accessToken);
    setFiles(result);
    onFilesChanged?.(result);
  }, [api, accessToken, submissionId, onFilesChanged]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!accessToken) {
      setLoading(false);
      return;
    }
    api
      .getFiles(submissionId, accessToken)
      .then((result) => {
        if (active) {
          setFiles(result);
          onFilesChanged?.(result);
        }
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar los archivos de la entrega."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, accessToken, submissionId, onFilesChanged]);

  const upload = useCallback(
    async (candidates: File[]) => {
      if (!accessToken || candidates.length === 0) return;

      const validationError = validateFiles(candidates, files.length);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setUploadingNames(candidates.map((file) => file.name));

      try {
        // One request carries the whole batch: the backend validates all of them before writing.
        await api.uploadFiles(submissionId, candidates, accessToken);
        await refresh();
      } catch (caught) {
        setError(errorMessage(caught, "No pudimos subir los archivos. Intenta de nuevo."));
      } finally {
        setUploadingNames([]);
      }
    },
    [api, accessToken, refresh, submissionId],
  );

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    void upload(Array.from(event.dataTransfer.files));
  };

  const handleDelete = async (fileId: number) => {
    if (!accessToken) return;
    setError(null);
    try {
      await api.deleteFile(submissionId, fileId, accessToken);
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught, "No pudimos eliminar el archivo."));
    }
  };

  const isUploading = uploadingNames.length > 0;
  const isFull = files.length >= MAX_FILES_PER_DELIVERY;

  return (
    <section className="file-board" aria-label="Archivos de la entrega">
      <header className="file-board-header">
        <div>
          <h3>Archivos de la entrega</h3>
          <p className="file-board-hint">
            PDF, Word, Excel o imágenes. Máximo {MAX_FILES_PER_DELIVERY} archivos de 10 MB.
          </p>
        </div>
        <span className="file-count">
          {files.length}/{MAX_FILES_PER_DELIVERY}
        </span>
      </header>

      <div
        className={`file-dropzone${isDragging ? " is-dragging" : ""}${isFull ? " is-disabled" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <Upload className="file-dropzone-icon" aria-hidden />
        <p>
          {isFull
            ? "Alcanzaste el máximo de archivos de esta entrega."
            : "Arrastra tus archivos aquí o selecciónalos desde tu equipo"}
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={isFull || isUploading || !accessToken}
          onClick={() => inputRef.current?.click()}
        >
          Seleccionar archivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="visually-hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={(event) => {
            void upload(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="file-board-error" role="alert">
          <AlertCircle aria-hidden /> {error}
        </p>
      )}

      {loading ? (
        <p className="file-board-empty">
          <Loader2 className="spin" aria-hidden /> Cargando archivos…
        </p>
      ) : files.length === 0 && !isUploading ? (
        <p className="file-board-empty">Todavía no has adjuntado archivos a esta entrega.</p>
      ) : (
        <ul className="file-list">
          {files.map((file) => (
            <li key={file.id} className="file-item">
              <span className="file-item-icon" aria-hidden>
                <FileText />
              </span>
              <span className="file-item-body">
                <span className="file-item-name" title={file.nombreOriginal}>
                  {file.nombreOriginal}
                </span>
                <span className="file-item-meta">
                  {formatFileSize(file.tamanoBytes)} · {file.mimeType}
                </span>
              </span>
              <div className="file-item-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Ver ${file.nombreOriginal}`}
                  onClick={() => setPreviewFile(file)}
                >
                  <Eye />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Quitar ${file.nombreOriginal}`}
                  onClick={() => void handleDelete(file.id)}
                >
                  <Trash2 />
                </button>
              </div>
            </li>
          ))}
          {uploadingNames.map((name) => (
            <li key={`uploading-${name}`} className="file-item is-uploading">
              <span className="file-item-icon" aria-hidden>
                <Loader2 className="spin" />
              </span>
              <span className="file-item-body">
                <span className="file-item-name">{name}</span>
                <span className="file-item-meta">Subiendo…</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!isUploading && files.length > 0 && (
        <p className="file-board-ok">
          <CheckCircle2 aria-hidden /> {files.length} de {MAX_FILES_PER_DELIVERY} archivos adjuntos.
        </p>
      )}

      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
    </section>
  );
}
