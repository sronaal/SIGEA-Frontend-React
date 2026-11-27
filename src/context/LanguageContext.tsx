import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { Language } from "@/lib/locale";
import { setCurrentLanguage } from "@/lib/locale";

const STORAGE_KEY = "sigea-language";

const TRANSLATIONS: Record<string, string> = {
  "Saltar al contenido": "Skip to content",
  "Aprender y acompañar": "Learn and support",
  "MI ESPACIO": "MY SPACE",
  "ESPACIO DOCENTE": "TEACHER SPACE",
  Inicio: "Home",
  "Mis calificaciones": "My grades",
  "Mis actividades": "My activities",
  "Mis entregas": "My submissions",
  "Mi perfil": "My profile",
  "Grupos y asignaturas": "Groups and subjects",
  Asistencia: "Attendance",
  Actividades: "Activities",
  Calificaciones: "Grades",
  "Cerrar sesión": "Sign out",
  "Sesión activa": "Active session",
  "Mi espacio": "My space",
  "Espacio docente": "Teacher space",
  "Cerrar menú": "Close menu",
  "Abrir menú": "Open menu",
  Notificaciones: "Notifications",
  "Navegación principal": "Main navigation",
  "No pudimos cargar la información": "We could not load the information",
  Cancelar: "Cancel",
  Cerrar: "Close",
  Buscar: "Search",
  "Cargando contenido": "Loading content",
  "BIENVENIDO": "WELCOME",
  "Inicia sesión": "Sign in",
  "Ingresa con los datos proporcionados por tu institución.": "Sign in with the credentials provided by your institution.",
  "Correo institucional": "Institutional email",
  Contraseña: "Password",
  "Ingresa tu contraseña": "Enter your password",
  "Mostrar contraseña": "Show password",
  "Ocultar contraseña": "Hide password",
  Ingresar: "Sign in",
  Ingresando: "Signing in",
  "¿Eres padre, madre o acudiente?": "Are you a parent or guardian?",
  "Consultar información académica de mi hijo, hija o acudido": "View my child's academic information",
  "COMUNIDAD EDUCATIVA": "EDUCATIONAL COMMUNITY",
  "Tu proceso académico, claro y siempre a la mano.": "Your academic journey, clear and always within reach.",
  "Un espacio sencillo para aprender, enseñar y acompañar cada avance.": "A simple space to learn, teach and support every step.",
  "Acceso institucional protegido": "Protected institutional access",
  "ACCESO INDEPENDIENTE": "INDEPENDENT ACCESS",
  "Consulta académica de acudientes": "Guardian academic access",
  "Identifica al estudiante. Después validaremos un código enviado al medio de contacto registrado, sin mostrar datos sensibles.": "Identify the student. We will then verify a code sent to the registered contact method without revealing sensitive data.",
  "Tipo de documento": "Document type",
  Seleccionar: "Select",
  "Tarjeta de identidad": "Identity card",
  "Registro civil": "Birth certificate",
  "Cédula de ciudadanía": "National ID",
  "Número de documento": "Document number",
  "No mostraremos información antes de validar el acceso.": "We will not show information before access is verified.",
  Continuar: "Continue",
  "La sesión de consulta expirará automáticamente por seguridad": "The consultation session will expire automatically for security",
  "VERIFICACIÓN SEGURA · PASO 2 DE 3": "SECURE VERIFICATION · STEP 2 OF 3",
  "Ingresa el código de seis dígitos": "Enter the six-digit code",
  "Enviaremos el código al medio de contacto registrado. Nunca revelamos el número ni el correo de contacto.": "We will send the code to the registered contact method. We never reveal the contact number or email.",
  "Código de verificación": "Verification code",
  "Verificando…": "Verifying…",
  "Verificar código": "Verify code",
  "¿No recibiste el código?": "Didn’t receive the code?",
  "Solicitar otro código": "Request another code",
  "Cambiar documento": "Change document",
  "Cambiar idioma a inglés": "Switch language to English",
  "Solicitud enviada. Revisa el medio de contacto registrado.": "Request sent. Check the registered contact method.",
  "Consulta temporal · solo lectura": "Temporary consultation · read-only",
  "Cerrar consulta": "Close consultation",
  "Solo lectura": "Read-only",
  "PERFIL ACADÉMICO AUTORIZADO": "AUTHORIZED ACADEMIC PROFILE",
  "Sin matrícula activa en el periodo consultado": "No active enrollment in the requested period",
  "Promedio general": "Overall average",
  "Actividades pendientes": "Pending activities",
  "Sin actividades publicadas": "No published activities",
  "Datos del estudiante": "Student information",
  "Año académico": "Academic year",
  Grado: "Grade",
  Grupo: "Group",
  Periodo: "Term",
  "No hay actividades publicadas para el grupo consultado.": "There are no published activities for the requested group.",
  Pendiente: "Pending",
  Entregada: "Submitted",
  Calificada: "Graded",
  Definitivo: "Final",
  Provisional: "Provisional",
  Disponible: "Available",
  "No disponible": "Unavailable",
  Tarea: "Assignment",
  Actividad: "Activity",
  Taller: "Workshop",
  Proyecto: "Project",
  "AL DÍA": "UP TO DATE",
  "PRÓXIMA ENTREGA": "NEXT DEADLINE",
  "No tienes actividades pendientes": "You have no pending activities",
  "No hay entregas pendientes por ahora.": "There are no pending submissions right now.",
  "Abrir actividad": "Open activity",
  "Próximas actividades": "Upcoming activities",
  "Organizadas por fecha de entrega": "Organized by due date",
  "Ver todas": "View all",
  "Cuando se publiquen nuevas actividades aparecerán aquí.": "New activities will appear here when published.",
  "Últimas calificaciones": "Latest grades",
  "Resultados publicados recientemente": "Recently published results",
  "Ver notas": "View grades",
  "Tus resultados aparecerán cuando el profesor los registre.": "Your results will appear when your teacher records them.",
  "Actividades registradas": "Recorded activities",
  "Todas las asignaturas": "All subjects",
  "Todos los estados": "All statuses",
  "Revisa instrucciones, fechas y el estado de cada entrega.": "Review instructions, dates and the status of each submission.",
  Instrucciones: "Instructions",
  "Nota registrada:": "Recorded grade:",
  "Retroalimentación:": "Feedback:",
  "Tu entrega": "Your submission",
  Respuesta: "Response",
  "Explica brevemente tu trabajo o agrega comentarios para el profesor.": "Briefly explain your work or add comments for your teacher.",
  "Escribe tu respuesta aquí…": "Write your response here…",
  "Archivo de referencia (opcional)": "Reference file (optional)",
  "Nombre o referencia del archivo que entregas.": "Name or reference of the file you are submitting.",
  Estado: "Status",
  Calificación: "Grade",
  "Fecha de entrega": "Submission date",
  "Historial de entregas": "Submission history",
  "Información académica registrada por tu institución.": "Academic information recorded by your institution.",
  Documento: "Document",
  "Año lectivo": "Academic year",
  Matrícula: "Enrollment",
  "Estas son tus asignaturas y grupos asignados.": "These are your assigned subjects and groups.",
  Asignaciones: "Assignments",
  "Asignaturas a tu cargo": "Subjects in your care",
  Estudiantes: "Students",
  "Matrículas en tus grupos": "Enrollments in your groups",
  "Mis asignaciones": "My assignments",
  "Asignatura, grupo y estudiantes matriculados": "Subject, group and enrolled students",
  Asignatura: "Subject",
  Año: "Year",
  Período: "Term",
  "Acciones frecuentes": "Frequent actions",
  "Continúa con tu trabajo docente": "Continue your teaching work",
  "Registrar asistencia": "Record attendance",
  "Un estado por estudiante y fecha": "One status per student and date",
  "Crear actividad": "Create activity",
  "Publica instrucciones y fecha límite": "Publish instructions and due date",
  "Registrar notas": "Record grades",
  "Evaluaciones del período": "Term assessments",
  "Consultar grupos": "View groups",
  "Promedio y asistencia por estudiante": "Average and attendance by student",
  "CARGA ACADÉMICA": "ACADEMIC LOAD",
  "REGISTRO DE SESIÓN": "SESSION RECORD",
  "REGISTRO DE EVALUACIONES": "ASSESSMENT RECORD",
  "CALIFICACIÓN DE ENTREGAS": "SUBMISSION GRADING",
  "Necesitas al menos una asignación para registrar asistencia.": "You need at least one assignment to record attendance.",
  "Sin registrar": "Not recorded",
  Total: "Total",
  "Revisa los estados antes de guardar.": "Review the statuses before saving.",
  "Crear evaluación": "Create assessment",
  "Guardar notas": "Save grades",
  "Registro de notas": "Gradebook",
  Estudiante: "Student",
  Nota: "Grade",
  Nivel: "Level",
  "Sin nota": "No grade",
  "Nueva evaluación": "New assessment",
  Nombre: "Name",
  "Ponderación (%)": "Weight (%)",
  "Una sola cifra decimal.": "One decimal place.",
  "Define los datos antes de registrar las notas del grupo.": "Define the details before recording group grades.",
  "NUEVA ACTIVIDAD": "NEW ACTIVITY",
  "Guárdala como borrador o publícala para tus estudiantes.": "Save it as a draft or publish it for your students.",
  "Tipo de actividad": "Activity type",
  Título: "Title",
  "Descripción e instrucciones": "Description and instructions",
  "Describe qué debe hacer el estudiante...": "Describe what the student should do…",
  "Fecha límite": "Due date",
  "Todos los tipos": "All types",
  "Contenido enviado": "Submitted content",
  Adjuntos: "Attachments",
  "Sin archivos adjuntos.": "No attachments.",
  Retroalimentación: "Feedback",
  "Escribe comentarios claros para el estudiante...": "Write clear comments for the student…",
  "Archivos de la entrega": "Submission files",
  "Seleccionar archivos": "Select files",
  "Cargando archivos…": "Loading files…",
  "Todavía no has adjuntado archivos a esta entrega.": "You have not attached files to this submission yet.",
  "Subiendo…": "Uploading…",
  "Cerrar vista previa": "Close preview",
  Descargar: "Download",
  "Cargando vista previa…": "Loading preview…",
  "Este tipo de archivo no se puede ver en el navegador. Descárgalo para abrirlo.": "This file type cannot be previewed in the browser. Download it to open it.",
  "Revisa los datos ingresados e inténtalo de nuevo.": "Check the entered information and try again.",
  "No pudimos conectar con el sistema. Inténtalo de nuevo.": "We could not connect to the system. Try again.",
  "No pudimos solicitar el código de verificación. Inténtalo de nuevo.": "We could not request the verification code. Try again.",
  "Superaste el número de intentos permitidos. Solicita un código nuevo para continuar.": "You exceeded the allowed number of attempts. Request a new code to continue.",
  "El código no es válido, expiró o ya fue utilizado. Solicita uno nuevo.": "The code is invalid, expired or already used. Request a new one.",
  "No pudimos validar el código. Inténtalo de nuevo.": "We could not verify the code. Try again.",
  "Tu sesión de consulta expiró. Inicia una nueva consulta para continuar.": "Your consultation session expired. Start a new consultation to continue.",
  "El acceso a este estudiante ya no está autorizado. Inicia una nueva consulta.": "Access to this student is no longer authorized. Start a new consultation.",
  "No pudimos cargar el perfil académico. Inténtalo de nuevo.": "We could not load the academic profile. Try again.",
};

function preserveWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated.trim()}${trailing}`;
}

function translateValue(value: string, language: Language): string {
  if (language === "es") return value;
  const trimmed = value.trim();
  if (TRANSLATIONS[trimmed]) return preserveWhitespace(value, TRANSLATIONS[trimmed]);
  const patterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^Hola, (.+)$/, (match) => `Hello, ${match[1]}`],
    [/^AÑO LECTIVO (.+)$/, (match) => `SCHOOL YEAR ${match[1]}`],
    [/^Estado: (.+)$/, (match) => `Status: ${match[1]}`],
    [/^Asistencia no disponible$/, () => "Attendance unavailable"],
    [/^Asistencia del período$/, () => "Term attendance"],
    [/^de (\d+) publicadas$/, (match) => `of ${match[1]} published`],
    [/^(\d+) de (\d+) archivos adjuntos\.$/, (match) => `${match[1]} of ${match[2]} attached files.`],
    [/^Ver (.+)$/, (match) => `View ${match[1]}`],
    [/^Quitar (.+)$/, (match) => `Remove ${match[1]}`],
    [/^Calificación de (.+)$/, (match) => `Grade for ${match[1]}`],
    [/^Asistencia de (.+)$/, (match) => `Attendance for ${match[1]}`],
    [/^Fecha límite: (.+)\. La calificación es independiente del registro de evaluaciones\.$/, (match) => `Due date: ${match[1]}. Grading is independent from the assessment record.`],
  ];
  for (const [pattern, replace] of patterns) {
    const match = trimmed.match(pattern);
    if (match) return preserveWhitespace(value, replace(match));
  }
  return value;
}

type LanguageContextValue = {
  language: Language;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function localizeDocument(language: Language): void {
  document.documentElement.lang = language;
  const root = document.getElementById("root");
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (!textNode.nodeValue?.trim() || ["SCRIPT", "STYLE"].includes(textNode.parentElement?.tagName ?? "")) continue;
    const current = textNode.nodeValue;
    const previous = originalText.get(textNode);
    const source = previous && (current === previous || current === translateValue(previous, "en")) ? previous : current;
    originalText.set(textNode, source);
    const translated = translateValue(source, language);
    if (translated !== current) textNode.nodeValue = translated;
  }

  root.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title], [alt]").forEach((element) => {
    for (const attribute of ["placeholder", "aria-label", "title", "alt"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const values = originalAttributes.get(element) ?? new Map<string, string>();
      const previous = values.get(attribute);
      const source = previous && (value === previous || value === translateValue(previous, "en")) ? previous : value;
      values.set(attribute, source);
      originalAttributes.set(element, values);
      const translated = translateValue(source, language);
      if (translated !== value) element.setAttribute(attribute, translated);
    }
  });
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "es";
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
  });

  setCurrentLanguage(language);

  useEffect(() => {
    document.documentElement.lang = language;
    if (window.localStorage.getItem(STORAGE_KEY) !== null || language !== "es") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    localizeDocument(language);
  }, [language]);

  useEffect(() => {
    const observer = new MutationObserver(() => localizeDocument(language));
    const root = document.getElementById("root");
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    toggleLanguage: () => setLanguage((current) => (current === "es" ? "en" : "es")),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  return value ?? { language: "es", toggleLanguage: () => undefined };
}

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <button type="button" className="language-toggle" onClick={toggleLanguage} aria-label={language === "es" ? "Cambiar idioma a inglés" : "Switch language to Spanish"}>
      {language === "es" ? "English" : "Español"}
    </button>
  );
}
