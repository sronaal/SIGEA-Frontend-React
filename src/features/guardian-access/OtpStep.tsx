import { useState } from "react";
import type { FormEvent } from "react";

import { LockKeyhole } from "lucide-react";

import { Button, FormField } from "@/components/ui";
import type { OtpRequestPayload } from "@/types/guardian";

export interface OtpStepProps {
  /** Identity document the challenge was issued for. */
  document: OtpRequestPayload;
  /** Generic message returned by the API; it never reveals whether the document exists. */
  notice: string;
  /** True while a verification is in flight. */
  busy: boolean;
  /** Error message of the last failed verification, if any. */
  error: string | null;
  /** True when the challenge was locked after too many failed attempts. */
  locked: boolean;
  /** True when a new code was requested during this step. */
  resendRequested: boolean;
  /** Called with the six digit code typed by the guardian. */
  onSubmit: (codigo: string) => void;
  /** Called when the guardian asks for a new code. */
  onResend: () => void;
  /** Called when the guardian wants to correct the identity document. */
  onBack: () => void;
}

/**
 * Step 2 of the guardian flow: validates the six digit code. The API answers 401 for a wrong,
 * expired or already used code and 429 when the challenge was locked.
 */
export default function OtpStep({
  document,
  notice,
  busy,
  error,
  locked,
  resendRequested,
  onSubmit,
  onResend,
  onBack,
}: OtpStepProps) {
  const [code, setCode] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6) return;
    onSubmit(code);
  };

  return (
    <>
      <div className="portal-icon">
        <LockKeyhole />
      </div>
      <p className="eyebrow">VERIFICACIÓN SEGURA · PASO 2 DE 3</p>
      <h1>Ingresa el código de seis dígitos</h1>
      <p>
        Enviaremos el código al medio de contacto registrado. Nunca revelamos el número ni el correo de contacto.
      </p>
      <div className="demo-code-note">
        <strong>{notice}</strong>
        <span>
          Documento: {document.numeroDocumento} · el código caduca y solo puede usarse una vez.
        </span>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <FormField label="Código de verificación">
          <input
            className="otp-input"
            required
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
          />
        </FormField>
        <Button type="submit" disabled={busy || locked || code.length !== 6}>
          {busy ? "Verificando…" : "Verificar código"}
        </Button>
      </form>
      <div className="resend-row">
        <span>
          {resendRequested ? "Solicitud enviada. Revisa el medio de contacto registrado." : "¿No recibiste el código?"}
        </span>
        <Button variant="ghost" disabled={busy} onClick={onResend}>
          Solicitar otro código
        </Button>
      </div>
      <Button variant="ghost" disabled={busy} onClick={onBack}>
        Cambiar documento
      </Button>
    </>
  );
}
