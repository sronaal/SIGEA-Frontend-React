import { useState } from "react";
import type { FormEvent } from "react";

import { ArrowRight, Eye, EyeOff, GraduationCap, ShieldCheck } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";

import { useAuthApi } from "@/app/providers";
import { Button, FormField } from "@/components/ui";
import { useAuthSession } from "@/context/AuthSessionContext";
import { ApiError } from "@/services/http";
import { roleHomePath } from "@/types/auth";

/** Basic institutional email check performed before the API is called. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  correo?: string;
  password?: string;
}

/**
 * Application access screen. The backend decides the role of the credentials: the page only
 * stores the returned session in memory and navigates to the panel of that role.
 */
export default function LoginPage() {
  const api = useAuthApi();
  const { isAuthenticated, role, startSession } = useAuthSession();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={roleHomePath(role)} replace />;
  }

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const normalized = correo.trim();

    if (!normalized) {
      next.correo = "Ingresa tu correo institucional.";
    } else if (!EMAIL_PATTERN.test(normalized)) {
      next.correo = "Ingresa un correo institucional válido.";
    }

    if (!password) {
      next.password = "Ingresa tu contraseña.";
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    if (!validate()) return;

    setBusy(true);
    try {
      const session = await api.login({ correo: correo.trim(), password });
      startSession(session);
      navigate(roleHomePath(session.role), { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "No pudimos iniciar sesión. Intenta de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-aside">
        <div className="login-brand">
          <div className="brand-mark">
            <GraduationCap />
          </div>
          <strong>SIGEA</strong>
        </div>
        <div className="login-message">
          <span className="login-kicker">COMUNIDAD EDUCATIVA</span>
          <h1>Tu proceso académico, claro y siempre a la mano.</h1>
          <p>Un espacio sencillo para aprender, enseñar y acompañar cada avance.</p>
        </div>
        <div className="login-trust">
          <ShieldCheck />
          <span>Acceso institucional protegido</span>
        </div>
      </section>

      <main className="login-main">
        <div className="login-card">
          <div className="mobile-login-brand">
            <div className="brand-mark">
              <GraduationCap />
            </div>
            <strong>SIGEA</strong>
          </div>

          <p className="eyebrow">BIENVENIDO</p>
          <h1>Inicia sesión</h1>
          <p className="login-intro">Ingresa con los datos proporcionados por tu institución.</p>

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FormField label="Correo institucional" error={fieldErrors.correo}>
              <input
                type="email"
                name="correo"
                autoComplete="username"
                spellCheck={false}
                placeholder="estudiante@colegio.edu.co"
                value={correo}
                aria-invalid={fieldErrors.correo ? true : undefined}
                onChange={(event) => setCorreo(event.target.value)}
              />
            </FormField>

            <FormField label="Contraseña" error={fieldErrors.password}>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  aria-label="Contraseña"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  aria-invalid={fieldErrors.password ? true : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </FormField>

            <Button type="submit" disabled={busy}>
              {busy ? "Ingresando…" : "Ingresar"}
              <ArrowRight />
            </Button>
          </form>

          <div className="parent-access">
            <span>¿Eres padre, madre o acudiente?</span>
            <Link to="/acudientes">
              Consultar información académica de mi hijo, hija o acudido <ArrowRight />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
