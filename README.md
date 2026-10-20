# SIGEA Frontend

Aplicación web del **Sistema de Gestión y Seguimiento Académico (SIGEA)**, construida con React,
TypeScript y Vite. Consume la API REST del
[backend SIGEA](https://github.com/sronaal/SIGEA-Backend-Java) y cubre tres experiencias:

- **Estudiantes:** dashboard, calificaciones, actividades, entregas y perfil.
- **Profesores:** grupos, asistencia, actividades, revisión de entregas y calificaciones.
- **Acudientes:** consulta de solo lectura con documento del estudiante y verificación OTP.

El proyecto forma parte del programa Tecnólogo en Análisis y Desarrollo de Software (ADSO) del
SENA. Todos los datos de demostración son ficticios.

## Stack

| Componente | Versión |
|---|---|
| React | 19.2 |
| TypeScript | 5.9 (`strict`) |
| Vite | 8.3 |
| React Router | 7.18 |
| Tailwind CSS | 4.3 |
| Vitest + React Testing Library | 5.0 / 16.3 |
| Iconos | lucide-react |

## Requisitos

- Node.js 22 LTS (Vite 8 requiere `^20.19.0` o `>=22.12.0`).
- npm 10 o superior.
- El backend SIGEA corriendo en `http://localhost:8080` con el perfil `local`.

## Inicio rápido

### 1. Variables de entorno

```bash
cp .env.example .env
```

```properties
VITE_API_URL=http://localhost:8080
VITE_INSTITUTION_NAME=Institución Educativa Horizonte
```

`VITE_INSTITUTION_NAME` es opcional: si no se define, la barra superior muestra `SIGEA`.

### 2. Backend

En el repositorio del backend:

```bash
docker compose up -d --wait
cp .env.example .env
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

El perfil `local` carga la semilla de demostración. El backend exige un único `FRONTEND_URL`
(`http://localhost:5173` por defecto) y falla al arrancar si falta o es inválido. Si el valor no
coincide con el origen real, el navegador rechaza las peticiones por CORS.

### 3. Frontend

```bash
npm install
npm run dev
```

Aplicación: <http://localhost:5173>

## Cuentas de demostración

Contraseña para todas: `Sigea#2026`

| Correo | Rol |
|---|---|
| `andres.rodriguez@sigea.local` | Profesor (8A y 8B) |
| `laura.gomez@sigea.local` | Profesora (Ciencias e Informática) |
| `carlos.ramirez@sigea.local` | Profesor (Inglés y Sociales) |
| `juan.perez@sigea.local` | Estudiante (8A) |
| `ana.restrepo@sigea.local` | Estudiante (8A) |
| `luis.rios@sigea.local` | Estudiante (8B) |
| `sofia.lopera@sigea.local` | Estudiante (9A) |

El login redirige según el rol: `/estudiante` o `/profesor`.

### Portal de acudientes

1. Abrir <http://localhost:5173/acudientes>.
2. Usar `TARJETA_IDENTIDAD` y el documento `1000000001`.
3. Con el perfil `local` del backend, el OTP se escribe en `backend/target/local-otp/`.

La respuesta de identificación es genérica: no revela si el documento existe.

## Rutas

| Ruta | Acceso | Pantalla |
|---|---|---|
| `/login` | Público | Inicio de sesión |
| `/acudientes` | Público | Identificación, OTP y perfil del acudiente |
| `/estudiante` | Estudiante | Dashboard académico |
| `/estudiante/calificaciones` | Estudiante | Calificaciones por asignatura |
| `/estudiante/actividades` | Estudiante | Actividades publicadas |
| `/estudiante/actividades/:id` | Estudiante | Detalle y entrega |
| `/estudiante/entregas` | Estudiante | Historial de entregas |
| `/estudiante/perfil` | Estudiante | Perfil y matrícula |
| `/profesor` | Profesor | Dashboard del docente |
| `/profesor/grupos` | Profesor | Grupos y estudiantes |
| `/profesor/asistencia` | Profesor | Registro de asistencia |
| `/profesor/actividades` | Profesor | Crear y publicar actividades |
| `/profesor/actividades/:id/entregas` | Profesor | Revisar y calificar entregas |
| `/profesor/calificaciones` | Profesor | Evaluaciones y notas |

Las rutas privadas están protegidas por rol; una sesión de estudiante no puede abrir el panel del
profesor y viceversa.

## Comportamiento de datos

- **Todo dato académico viene de la API**: no hay mocks, fixtures ni valores de relleno en las
  pantallas.
- Si la API no devuelve una métrica, la interfaz muestra `—`, `No disponible` o el estado
  `UNAVAILABLE`; nunca inventa un cero.
- Las actividades y evaluaciones se recargan desde la API después de crear o publicar.
- La asistencia sólo muestra estados registrados; un estudiante sin registro queda **sin marcar**
  y no se envía como `PRESENTE` por defecto.
- Al guardar una entrega, una nota o una asistencia, la pantalla se refresca con los datos
  persistidos.

## Sesión

Los JWT de estudiante, profesor y acudiente viven **solo en memoria**. No se escriben en
`localStorage`, `sessionStorage`, cookies ni en la URL. Al recargar la página la sesión se pierde y
hay que volver a iniciar sesión; es una decisión de seguridad deliberada.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Bundle de producción en `dist/` |
| `npm run preview` | Sirve el bundle de producción |
| `npm run typecheck` | `tsc --noEmit` para app y configuración |
| `npm run lint` | ESLint |
| `npm test` | Vitest en modo CI (`vitest run`) |
| `npm run test:watch` | Vitest en modo watch |

## Pruebas

```bash
npm test
npm run typecheck
npm run build
```

Estado actual: **90 tests en 11 archivos**, typecheck y build verdes. Los tests usan jsdom y
React Testing Library; no requieren backend ni base de datos.

## Estructura

```text
src/
├── app/                 Router, guards y providers
├── components/          UI reutilizable y estados de feedback
├── context/             Sesiones en memoria (estudiante/profesor y acudiente)
├── features/
│   ├── auth/            Login
│   ├── student/         Portal del estudiante
│   ├── teacher/         Panel del profesor
│   ├── grades/          Evaluaciones y calificaciones
│   └── guardian-access/ Identificación, OTP y perfil del acudiente
├── layouts/             Shell con navegación por rol
├── lib/                 Formateo de fechas, notas y porcentajes
├── services/            Cliente HTTP y servicios por dominio
└── types/               Tipos espejo del contrato del backend
```

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `VITE_API_URL` | Sí | Base URL del backend (`http://localhost:8080`) |
| `VITE_INSTITUTION_NAME` | No | Nombre visible en la barra superior |

Vite expone estas variables en el bundle: no deben contener secretos. El archivo `.env` está
ignorado por Git.

## Build de producción

```bash
npm run build
npm run preview
```

El resultado queda en `dist/` y puede servirse con cualquier servidor estático. Recordá configurar
`VITE_API_URL` con la URL pública del backend antes de compilar y `FRONTEND_URL` en el backend con
el origen del frontend desplegado.
