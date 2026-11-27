import { useState } from "react";

import { CalendarCheck, GraduationCap } from "lucide-react";

import { useGuardianAccessApi } from "@/app/providers";
import { useGuardianSession } from "@/context/GuardianSessionContext";
import { LanguageToggle } from "@/context/LanguageContext";
import IdentifyStep from "@/features/guardian-access/IdentifyStep";
import OtpStep from "@/features/guardian-access/OtpStep";
import ProfileView from "@/features/guardian-access/ProfileView";
import {
  describeProfileError,
  describeRequestError,
  describeVerifyError,
} from "@/features/guardian-access/labels";
import { ApiError } from "@/services/http";
import type { GuardianProfile, OtpRequestPayload } from "@/types/guardian";

type Step = "identify" | "otp" | "profile";

/**
 * Guardian access screen: identify → one-time code → read-only academic profile.
 *
 * The session token is held in memory by the session context and never persisted. Closing the
 * consultation discards it and returns to the first step.
 */
export default function GuardianAccessPage() {
  const api = useGuardianAccessApi();
  const { startSession, clearSession } = useGuardianSession();

  const [step, setStep] = useState<Step>("identify");
  const [identity, setIdentity] = useState<OtpRequestPayload | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [resendRequested, setResendRequested] = useState(false);
  const [profile, setProfile] = useState<GuardianProfile | null>(null);

  const handleRequest = async (payload: OtpRequestPayload): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const response = await api.request(payload);
      setIdentity(payload);
      setNotice(response.message);
      setLocked(false);
      setStep("otp");
    } catch (caught) {
      setError(describeRequestError(caught));
    } finally {
      setBusy(false);
    }
  };

  const loadProfile = async (accessToken: string): Promise<void> => {
    try {
      const loaded = await api.profile(accessToken);
      setProfile(loaded);
      setError(null);
      setStep("profile");
    } catch (caught) {
      clearSession();
      setProfile(null);
      setStep("identify");
      setError(describeProfileError(caught));
    }
  };

  const handleVerify = async (codigo: string): Promise<void> => {
    if (!identity) return;
    setBusy(true);
    setError(null);
    try {
      const session = await api.verify({
        tipoDocumento: identity.tipoDocumento,
        numeroDocumento: identity.numeroDocumento,
        codigo,
      });
      startSession({ accessToken: session.accessToken, expiresAt: session.expiresAt });
      setResendRequested(false);
      await loadProfile(session.accessToken);
    } catch (caught) {
      if (caught instanceof ApiError && caught.isTooManyAttempts) {
        setLocked(true);
      }
      setError(describeVerifyError(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!identity) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.request(identity);
      setNotice(response.message);
      setLocked(false);
      setResendRequested(true);
    } catch (caught) {
      setError(describeRequestError(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleBack = (): void => {
    setStep("identify");
    setIdentity(null);
    setNotice("");
    setError(null);
    setLocked(false);
    setResendRequested(false);
  };

  const handleClose = (): void => {
    clearSession();
    setProfile(null);
    setIdentity(null);
    setNotice("");
    setError(null);
    setLocked(false);
    setResendRequested(false);
    setStep("identify");
  };

  if (step === "profile" && profile) {
    return <ProfileView profile={profile} onClose={handleClose} />;
  }

  return (
    <div className="portal-page">
      <div className="portal-toolbar"><LanguageToggle /></div>
      <div className="portal-brand">
        <div className="brand-mark">
          <GraduationCap />
        </div>
        <strong>SIGEA Familias</strong>
      </div>
      <section className="portal-card">
        {step === "otp" && identity ? (
          <OtpStep
            document={identity}
            notice={notice}
            busy={busy}
            error={error}
            locked={locked}
            resendRequested={resendRequested}
            onSubmit={handleVerify}
            onResend={handleResend}
            onBack={handleBack}
          />
        ) : (
          <IdentifyStep busy={busy} error={error} onSubmit={handleRequest} />
        )}
        <p className="portal-footer">
          <CalendarCheck />
          La sesión de consulta expirará automáticamente por seguridad
        </p>
      </section>
    </div>
  );
}
