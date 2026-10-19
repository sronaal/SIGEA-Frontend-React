import { useState } from "react";
import type { FormEvent } from "react";

import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button, FormField } from "@/components/ui";
import { DOCUMENT_TYPE_OPTIONS } from "@/features/guardian-access/labels";
import type { DocumentType, OtpRequestPayload } from "@/types/guardian";

export interface IdentifyStepProps {
  /** True while a request is in flight. */
  busy: boolean;
  /** Error message of the last failed request, if any. */
  error: string | null;
  /** Called with the identity document typed by the guardian. */
  onSubmit: (payload: OtpRequestPayload) => void;
}

/**
 * Step 1 of the guardian flow: collects the identity document of the student. The document
 * alone never reveals whether it exists: the API always answers the same generic 202.
 */
export default function IdentifyStep({ busy, error, onSubmit }: IdentifyStepProps) {
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [documentNumber, setDocumentNumber] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentType) return;
    onSubmit({ tipoDocumento: documentType, numeroDocumento: documentNumber.trim() });
  };

  return (
    <>
      <div className="portal-icon">
        <ShieldCheck />
      </div>
      <p className="eyebrow">ACCESO INDEPENDIENTE</p>
      <h1>Consulta académica de acudientes</h1>
      <p>
        Identifica al estudiante. Después validaremos un código enviado al medio de contacto registrado, sin
        mostrar datos sensibles.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <FormField label="Tipo de documento">
          <select
            required
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentType | "")}
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Número de documento"
          hint="No mostraremos información antes de validar el acceso."
        >
          <input
            required
            name="numeroDocumento"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            placeholder="Número de documento"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value.slice(0, 20))}
          />
        </FormField>
        <Button type="submit" disabled={busy || documentType === "" || documentNumber.trim() === ""}>
          {busy ? "Enviando…" : "Continuar"}
          <ArrowRight />
        </Button>
      </form>
    </>
  );
}
