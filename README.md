# SIGEA — Frontend (portal de accedientes)

Aplicación React + TypeScript strict que consume la API REST del backend SIGEA
(`backend/`, Spring Boot 4.1.1). Hoy expone el **portal de accedientes**:
identificación del estudiante → código OTP → consulta académica de solo lectura.

## Stack

- React 19 + TypeScript 5.7 (`strict`)
- Vite 8 + Tailwind CSS v4 (tema replicado de `SIGEA_Prototipo/`)
- react-router 7
- Vitest 5 + React Testing Library

## Levantar en local

```bash
# 1) variables de entorno
cp .env.example .env        # VITE_API_URL apunta al backend

# 2) dependencias
npm install

# 3) backend arriba (en otro repo) — perfil local, aplica la semilla V900
cd ../backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 4) frontend
npm run dev                 # http://localhost:5173
```

El backend valida `FRONTEND_URL` al arrancar: debe coincidir con el origen real
del frontend o el arranque falla (por diseño, para no dejar el CORS abierto).

## Comandos

| Comando             | Qué hace                                        |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | servidor de desarrollo                          |
| `npm run build`     | bundle de producción en `dist/`                |
| `npm run preview`   | sirve el bundle de producción                   |
| `npm run lint`      | ESLint                                          |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm test`          | Vitest (modo watch: `vitest`)                   |

## Flujo del portal

1. **Identificar** — tipo y número de documento del estudiante. La respuesta del
   backend es genérica: no revela si el documento existe.
2. **Código** — código de 6 dígitos recibido por el medio de contacto registrado.
   `401` = código inválido, expirado o ya usado; `429` = bloqueo por 5 intentos.
3. **Perfil** — métricas reales del estudiante vinculado: promedio (con estado
   `PROVISIONAL` / `DEFINITIVE` / `UNAVAILABLE`), asistencia y actividades.
   Si el backend no trae un dato, la pantalla lo dice; no inventa cifras.

El token de sesión vive **solo en memoria** (nunca en `localStorage` ni
`sessionStorage`). "Cerrar consulta" lo descarta.

## Estructura

```
src/
  app/          router y providers
  components/   piezas de UI (Button, FormField, StatusBadge)
  context/      GuardianSessionContext (token en memoria)
  features/     guardian-access/ (IdentifyStep, OtpStep, ProfileView)
  services/     http.ts y guardianAccess.ts
  types/        tipos espejo del contrato del backend
```
