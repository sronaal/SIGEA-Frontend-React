import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Plus,
  Save,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import { useTeacherWorkspaceApi } from "@/app/providers";
import { LoadError } from "@/components/feedback";
import {
  Button,
  EmptyState,
  FilterDropdown,
  LoadingSkeleton,
  PageHeader,
  StatCard,
  StudentAvatar,
} from "@/components/ui";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  errorMessage,
  initialsOf,
  todayAsIsoDate,
} from "@/lib/format";
import type {
  AttendanceStatus,
  TeacherAssignment,
  TeacherAttendanceRecord,
  TeacherStudent,
} from "@/types/academic";

const ATTENDANCE_STATES: AttendanceStatus[] = ["PRESENTE", "AUSENTE", "TARDE", "JUSTIFICADO"];

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENTE: "Presente",
  AUSENTE: "Ausente",
  TARDE: "Tarde",
  JUSTIFICADO: "Justificado",
};

const ATTENDANCE_PLURALS: Record<AttendanceStatus, string> = {
  PRESENTE: "Presentes",
  AUSENTE: "Ausentes",
  TARDE: "Tardanzas",
  JUSTIFICADO: "Justificados",
};

function assignmentLabel(assignment: TeacherAssignment): string {
  return `${assignment.subject} · ${assignment.grade}° ${assignment.group}`;
}

function enrollmentLine(assignment: TeacherAssignment): string {
  return `${assignment.studentCount} estudiantes`;
}

function emptyStatuses(students: TeacherStudent[]): Record<number, AttendanceStatus> {
  return Object.fromEntries(students.map((student) => [student.id, "PRESENTE" as AttendanceStatus]));
}

/** Landing of the professor: the real teaching assignments returned by the API. */
export function TeacherDashboardPage() {
  const api = useTeacherWorkspaceApi();
  const { accessToken, user } = useAuthSession();
  const [assignments, setAssignments] = useState<TeacherAssignment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getAssignments(accessToken)
      .then((response) => {
        if (active) setAssignments(response.assignments);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, "No pudimos cargar tus asignaciones."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

  if (loading) {
    return (
      <div className="page">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <PageHeader eyebrow="ESPACIO DOCENTE" title="Inicio" />
        <LoadError message={error} />
      </div>
    );
  }

  if (!assignments) return null;

  const students = assignments.reduce((total, assignment) => total + assignment.studentCount, 0);
  const years = [...new Set(assignments.map((assignment) => assignment.academicYear))];
  const year = years.length === 1 ? years[0] : null;
  const periods = [
    ...new Set(
      assignments
        .map((assignment) => assignment.period)
        .filter((period): period is number => period !== null),
    ),
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow={year ? `CARGA ACADÉMICA · ${year}` : "ESPACIO DOCENTE"}
        title={`Hola, ${user?.nombres ?? "profesor"}`}
        description="Estas son tus asignaturas y grupos asignados."
      />

      <div className="teacher-summary-grid">
        <StatCard
          label="Asignaciones"
          value={String(assignments.length)}
          hint="Asignaturas a tu cargo"
          icon={BookOpen}
          tone="blue"
        />
        <StatCard
          label="Estudiantes"
          value={String(students)}
          hint="Matrículas en tus grupos"
          icon={Users}
          tone="mint"
        />
        <section className="card teacher-next">
          <div className="priority-icon">
            <CalendarCheck />
          </div>
          <div>
            <span>{periods.length > 0 ? `PERÍODO ${periods.join(" · ")}` : "PERÍODO ACTUAL"}</span>
            <h2>
              {assignments[0] ? assignmentLabel(assignments[0]) : "Aún no tienes grupos asignados"}
            </h2>
            <p>
              {assignments[0]
                ? `${enrollmentLine(assignments[0])} · ${assignments[0].academicYear}`
                : "Cuando la institución te asigne grupos aparecerán aquí."}
            </p>
          </div>
          {assignments[0] && (
            <Link to="/profesor/asistencia">
              Registrar asistencia <ChevronRight />
            </Link>
          )}
        </section>
      </div>

      {assignments.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={Users}
            title="Sin asignaciones"
            description="Cuando la institución te asigne grupos aparecerán en este panel."
          />
        </section>
      ) : (
        <div className="teacher-grid">
          <section className="card schedule-card">
            <div className="card-heading">
              <div>
                <h2>Mis asignaciones</h2>
                <p>Asignatura, grupo y estudiantes matriculados</p>
              </div>
              <BookOpen />
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asignatura</th>
                    <th>Grupo</th>
                    <th>Grado</th>
                    <th>Año</th>
                    <th>Período</th>
                    <th>Estudiantes</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <strong>{assignment.subject}</strong>
                      </td>
                      <td>{assignment.group}</td>
                      <td>{assignment.grade}°</td>
                      <td>{assignment.academicYear}</td>
                      <td>{assignment.period ?? "—"}</td>
                      <td>{assignment.studentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card quick-card">
            <div className="card-heading">
              <div>
                <h2>Acciones frecuentes</h2>
                <p>Continúa con tu trabajo docente</p>
              </div>
            </div>
            <Link to="/profesor/asistencia" className="quick-link tone-blue">
              <CalendarCheck />
              <div>
                <strong>Registrar asistencia</strong>
                <span>Un estado por estudiante y fecha</span>
              </div>
              <ChevronRight />
            </Link>
            <Link to="/profesor/actividades" className="quick-link tone-lavender">
              <Plus />
              <div>
                <strong>Crear actividad</strong>
                <span>Publica instrucciones y fecha límite</span>
              </div>
              <ChevronRight />
            </Link>
            <Link to="/profesor/calificaciones" className="quick-link tone-mint">
              <ClipboardCheck />
              <div>
                <strong>Registrar notas</strong>
                <span>Evaluaciones del período</span>
              </div>
              <ChevronRight />
            </Link>
            <Link to="/profesor/grupos" className="quick-link tone-yellow">
              <Users />
              <div>
                <strong>Consultar grupos</strong>
                <span>Promedio y asistencia por estudiante</span>
              </div>
              <ChevronRight />
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}

/** Attendance of one session: one state per student, saved as a single batch. */
export function AttendancePage() {
  const api = useTeacherWorkspaceApi();
  const { accessToken } = useAuthSession();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [date, setDate] = useState(todayAsIsoDate());
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>({});
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    api
      .getAssignments(accessToken)
      .then((response) => {
        if (!active) return;
        setAssignments(response.assignments);
        setSelectedId((current) => current ?? response.assignments[0]?.id ?? null);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught, "No pudimos cargar tus asignaciones."));
      })
      .finally(() => {
        if (active) setLoadingAssignments(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken]);

  useEffect(() => {
    if (!accessToken || selectedId === null) return;
    let active = true;

    Promise.all([api.getStudents(selectedId, accessToken), api.getAttendance(selectedId, date, accessToken)])
      .then(([studentList, attendance]) => {
        if (!active) return;
        setStudents(studentList.students);
        const initial = emptyStatuses(studentList.students);
        attendance.records.forEach((record: TeacherAttendanceRecord) => {
          initial[record.studentId] = record.status;
        });
        setStatuses(initial);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught, "No pudimos cargar la sesión de asistencia."));
      })
      .finally(() => {
        if (active) setLoadingSession(false);
      });

    return () => {
      active = false;
    };
  }, [api, accessToken, selectedId, date]);

  const selected = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedId) ?? null,
    [assignments, selectedId],
  );

  const selectAssignment = (assignmentId: number): void => {
    setSelectedId(assignmentId);
    setLoadingSession(true);
    setLoadError(null);
    setSaveError(null);
    setSaved(false);
  };

  const selectDate = (nextDate: string): void => {
    setDate(nextDate);
    setLoadingSession(true);
    setLoadError(null);
    setSaveError(null);
    setSaved(false);
  };

  const count = (state: AttendanceStatus): number =>
    Object.values(statuses).filter((value) => value === state).length;

  const setAllPresent = (): void => {
    setSaved(false);
    setStatuses(emptyStatuses(students));
  };

  const setStatus = (studentId: number, status: AttendanceStatus): void => {
    setSaved(false);
    setStatuses((current) => ({ ...current, [studentId]: status }));
  };

  const handleSave = async (): Promise<void> => {
    setSaveError(null);
    setSaved(false);
    if (!accessToken || selectedId === null) return;

    setSaving(true);
    try {
      await api.saveAttendance(
        selectedId,
        {
          date,
          records: students.map((student) => ({
            studentId: student.id,
            status: statuses[student.id] ?? "PRESENTE",
          })),
        },
        accessToken,
      );
      setSaved(true);
    } catch (caught) {
      setSaveError(errorMessage(caught, "No pudimos guardar la asistencia. Intenta de nuevo."));
    } finally {
      setSaving(false);
    }
  };

  if (loadingAssignments) {
    return (
      <div className="page">
        <LoadingSkeleton />
      </div>
    );
  }

  if (loadError && assignments.length === 0) {
    return (
      <div className="page">
        <PageHeader eyebrow="REGISTRO DE SESIÓN" title="Asistencia" />
        <LoadError message={loadError} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="REGISTRO DE SESIÓN"
        title="Asistencia"
        description={
          selected
            ? `${assignmentLabel(selected)} · un único estado por estudiante y fecha.`
            : "Selecciona una asignación para registrar la asistencia."
        }
        action={
          students.length > 0 ? (
            <Button variant="secondary" onClick={setAllPresent}>
              <Check /> Marcar todos presentes
            </Button>
          ) : undefined
        }
      />

      {assignments.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={CalendarCheck}
            title="Sin asignaciones"
            description="Necesitas al menos una asignación para registrar asistencia."
          />
        </section>
      ) : (
        <section className="card attendance-card">
          <div className="attendance-filters">
            <FilterDropdown
              label="Asignación"
              value={selectedId ?? ""}
              onChange={(event) => selectAssignment(Number(event.target.value))}
            >
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignmentLabel(assignment)}
                </option>
              ))}
            </FilterDropdown>
            <label className="date-field">
              <CalendarDays />
              <input
                aria-label="Fecha de la sesión"
                type="date"
                value={date}
                onChange={(event) => selectDate(event.target.value)}
              />
            </label>
            <div className="session-meta">
              <Clock />
              <span>{selected ? `${selected.academicYear} · Período ${selected.period ?? "—"}` : "—"}</span>
            </div>
          </div>

          {loadError && (
            <p className="field-error" role="alert">
              {loadError}
            </p>
          )}

          {loadingSession ? (
            <LoadingSkeleton />
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin estudiantes"
              description="La asignación no tiene estudiantes matriculados."
            />
          ) : (
            <>
              <div className="attendance-summary attendance-summary-five">
                <div>
                  <strong>{students.length}</strong>
                  <span>Total</span>
                </div>
                {ATTENDANCE_STATES.map((state) => (
                  <div key={state}>
                    <strong data-testid={`attendance-count-${state}`}>{count(state)}</strong>
                    <span>{ATTENDANCE_PLURALS[state]}</span>
                  </div>
                ))}
              </div>

              <div className="attendance-list">
                {students.map((student) => (
                  <div className="attendance-row" key={student.id}>
                    <div className="student-cell">
                      <StudentAvatar initials={initialsOf(student.nombres, student.apellidos)} />
                      <div>
                        <strong>
                          {student.nombres} {student.apellidos}
                        </strong>
                        <span>{student.numeroDocumento}</span>
                      </div>
                    </div>
                    <div
                      className="attendance-selector"
                      role="group"
                      aria-label={`Asistencia de ${student.nombres} ${student.apellidos}`}
                    >
                      {ATTENDANCE_STATES.map((state) => (
                        <button
                          type="button"
                          key={state}
                          className={`attendance-option attendance-${state.toLowerCase()} ${
                            statuses[student.id] === state ? "selected" : ""
                          }`}
                          aria-pressed={statuses[student.id] === state}
                          onClick={() => setStatus(student.id, state)}
                        >
                          <span className="selector-mark">
                            {statuses[student.id] === state && <Check />}
                          </span>
                          {ATTENDANCE_LABELS[state]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="attendance-footer">
                <div>
                  {saveError && (
                    <p className="field-error" role="alert">
                      {saveError}
                    </p>
                  )}
                  {saved && (
                    <div className="success-message" role="status">
                      <Check /> Asistencia guardada correctamente.
                    </div>
                  )}
                  {!saved && !saveError && <span>Revisa los estados antes de guardar.</span>}
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  <Save /> {saving ? "Guardando…" : "Guardar asistencia"}
                </Button>
              </div>
            </>
          )}
        </section>
      )}

    </div>
  );
}
