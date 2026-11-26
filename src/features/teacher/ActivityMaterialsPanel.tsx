import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, FileText, Loader2, Trash2, Upload } from "lucide-react";

import { useTeacherWorkspaceApi } from "@/app/providers";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILES_PER_DELIVERY,
  formatFileSize,
  validateFiles,
} from "@/components/FileBoard";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { Button, EmptyState } from "@/components/ui";
import { useAuthSession } from "@/context/AuthSessionContext";
import { errorMessage } from "@/lib/format";
import type { FileMetadata } from "@/types/files";

type ActivityMaterialsPanelProps = {
  /** Activity that owns the materials. */
  activityId: number;
  /** Title shown in the drawer heading. */
  activityTitle: string;
  /** Closes the drawer. */
  onClose: () => void;
};

const ACCEPTED = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

/**
 * Materials of an activity, as seen by its professor: list, upload, preview and delete through
 * `POST/GET/DELETE /api/v1/activities/{id}/files`. The batch rules are the same as the delivery
 * board (up to five files of ten megabytes, academic document types) and are validated before the
 * request leaves the browser; the server enforces them again.
 */
export function ActivityMaterialsPanel({ activityId, activityTitle, onClose }: ActivityMaterialsPanelProps) {
  const api = useTeacherWorkspaceApi();
  const { accessToken } = useAuthSession();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileMetadata[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<FileMetadata | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getActivityFiles(activityId, accessToken)
      .then((response) => {
        if (active) setFiles(response);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught, "No pudimos cargar los materiales."));
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, activityId]);

  const handleSelect = async (candidates: FileList | null): Promise<void> => {
    if (!candidates || candidates.length === 0 || !accessToken) return;
    const selected = Array.from(candidates);
    setActionError(null);
    setMessage(null);

    const invalid = validateFiles(selected, files?.length ?? 0);
    if (invalid) {
      setActionError(invalid);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      const stored = await api.uploadActivityFiles(activityId, selected, accessToken);
      setFiles((current) => [...(current ?? []), ...stored]);
      setMessage(
        stored.length === 1
          ? "Material adjuntado correctamente."
          : "Materiales adjuntados correctamente.",
      );
    } catch (caught) {
      setActionError(errorMessage(caught, "No pudimos subir los materiales."));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: number): Promise<void> => {
    if (!accessToken) return;
    setActionError(null);
    setMessage(null);

    setBusy(true);
    try {
      await api.deleteActivityFile(activityId, fileId, accessToken);
      setFiles((current) => (current ?? null)?.filter((file) => file.id !== fileId) ?? null);
      setMessage("Material eliminado correctamente.");
    } catch (caught) {
      setActionError(errorMessage(caught, "No pudimos eliminar el material."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="form-drawer"
        aria-label={`Materiales de ${activityTitle}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-heading">
          <div>
            <p className="eyebrow">MATERIALES DE LA ACTIVIDAD</p>
            <h2>{activityTitle}</h2>
            <p>
              Archivos de apoyo para tus estudiantes. Máximo {MAX_FILES_PER_DELIVERY} archivos de
              10 MB.
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        {loadError && (
          <p className="field-error" role="alert">
            {loadError}
          </p>
        )}
        {actionError && (
          <p className="field-error" role="alert">
            {actionError}
          </p>
        )}
        {message && (
          <div className="success-message" role="status">
            <CheckCircle2 aria-hidden /> {message}
          </div>
        )}

        <div className="file-upload">
          <Upload aria-hidden />
          <span>
            <strong>Subir materiales</strong>
            <small>
              {files?.length ?? 0}/{MAX_FILES_PER_DELIVERY} archivos · PDF, Word, Excel o imágenes
            </small>
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            disabled={busy}
            aria-label="Seleccionar materiales"
            onChange={(event) => void handleSelect(event.target.files)}
          />
        </div>

        {files === null ? (
          loadError ? null : <LoadingRow />
        ) : files.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin materiales"
            description="Esta actividad aún no tiene archivos de apoyo."
          />
        ) : (
          <ul className="materials-list">
            {files.map((file) => (
              <li key={file.id} className="materials-list-item">
                <FileText aria-hidden />
                <div>
                  <strong>{file.nombreOriginal}</strong>
                  <small>
                    {formatFileSize(file.tamanoBytes)} · {file.mimeType}
                  </small>
                </div>
                <div className="row-actions">
                  <Button variant="ghost" type="button" onClick={() => setPreview(file)}>
                    <Eye aria-hidden /> Ver
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(file.id)}
                    aria-label={`Eliminar ${file.nombreOriginal}`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {busy && (
          <p className="muted" role="status">
            <Loader2 className="spin" aria-hidden /> Procesando…
          </p>
        )}
        {!busy && files !== null && files.length >= MAX_FILES_PER_DELIVERY && (
          <p className="field-error" role="status">
            <AlertCircle aria-hidden /> Llegaste al límite de {MAX_FILES_PER_DELIVERY} materiales.
          </p>
        )}

        <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
      </aside>
    </div>
  );
}

function LoadingRow() {
  return (
    <p className="muted" role="status">
      <Loader2 className="spin" aria-hidden /> Cargando materiales…
    </p>
  );
}
