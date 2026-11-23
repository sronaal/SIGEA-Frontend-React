import { useEffect, useState } from "react";
import { Download, FileText, Loader2, AlertCircle, X } from "lucide-react";

import { useStudentPortalApi } from "@/app/providers";
import { useAuthSession } from "@/context/AuthSessionContext";
import { Button } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import type { FileMetadata } from "@/types/files";

type FilePreviewDialogProps = {
  /** Attachment to render. */
  file: FileMetadata | null;
  /** Closes the preview. */
  onClose: () => void;
};

/**
 * Inline preview of a delivery attachment.
 *
 * The bytes are fetched with the session token (`GET /api/v1/files/{id}/preview`): the endpoint
 * authorizes by ownership, so the file can never be a plain `<img src>` without a bearer header.
 * The object URL is revoked when the dialog closes or the file changes.
 */
export function FilePreviewDialog({ file, onClose }: FilePreviewDialogProps) {
  const api = useStudentPortalApi();
  const { accessToken } = useAuthSession();

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !accessToken) return;
    let active = true;
    let created: string | null = null;

    setLoading(true);
    setError(null);
    setObjectUrl(null);

    api
      .getFileBlob(file.id, accessToken, "preview")
      .then((blob) => {
        if (!active) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos previsualizar el archivo."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [api, accessToken, file]);

  useEffect(() => {
    if (!file) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [file, onClose]);

  if (!file) return null;

  const download = async () => {
    if (!accessToken) return;
    try {
      const blob = await api.getFileBlob(file.id, accessToken, "download");
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = file.nombreOriginal;
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (caught) {
      setError(errorMessage(caught, "No pudimos descargar el archivo."));
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <p className="file-preview-status">
          <Loader2 className="spin" aria-hidden /> Cargando vista previa…
        </p>
      );
    }
    if (error) {
      return (
        <p className="file-board-error" role="alert">
          <AlertCircle aria-hidden /> {error}
        </p>
      );
    }
    if (!objectUrl) return null;
    if (file.mimeType.startsWith("image/")) {
      return <img className="file-preview-image" src={objectUrl} alt={file.nombreOriginal} />;
    }
    if (file.mimeType === "application/pdf") {
      return <iframe className="file-preview-frame" src={objectUrl} title={file.nombreOriginal} />;
    }
    return (
      <p className="file-preview-status">
        <FileText aria-hidden /> Este tipo de archivo no se puede ver en el navegador. Descárgalo
        para abrirlo.
      </p>
    );
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="dialog dialog--preview"
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${file.nombreOriginal}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="file-preview-header">
          <div>
            <h2>{file.nombreOriginal}</h2>
            <p>{file.mimeType}</p>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar vista previa">
            <X />
          </Button>
        </header>

        <div className="file-preview-body">{renderBody()}</div>

        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={() => void download()}>
            <Download /> Descargar
          </Button>
        </div>
      </div>
    </div>
  );
}
