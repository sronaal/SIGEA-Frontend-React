/**
 * Mirror of the student read-model of the SIGEA API.
 *
 * Source of truth (backend, Spring Boot):
 *   com.sigea.studentportal.dto.StudentProfileResponse
 *   com.sigea.studentportal.dto.StudentDashboardResponse
 *   com.sigea.studentportal.dto.StudentGradesResponse
 *   com.sigea.studentportal.dto.StudentActivitiesResponse
 *   com.sigea.studentportal.dto.StudentSubmissionsResponse
 *   com.sigea.studentportal.dto.StudentAttendanceResponse
 *
 * Every figure is computed by the backend from real rows. A metric without data is `null` plus
 * its `UNAVAILABLE` state; the frontend never invents a replacement value.
 */

/** State of a weighted average (specification §8.2). */
export type AverageStatus = "DEFINITIVE" | "PROVISIONAL" | "UNAVAILABLE";

/** Availability of the attendance percentage. */
export type AttendanceAvailability = "AVAILABLE" | "UNAVAILABLE";

/** State of a single attendance record. */
export type AttendanceStatus = "PRESENTE" | "AUSENTE" | "TARDE" | "JUSTIFICADO";

/** Derived state of a delivery: no row, row without grade, row with grade. */
export type SubmissionStatus = "PENDIENTE" | "ENTREGADA" | "CALIFICADA";

/** Active enrollment of the student. Every field is `null` when there is none. */
export interface StudentEnrollment {
  academicYear: number | null;
  grade: string | null;
  group: string | null;
  period: number | null;
}

/** Body of `GET /api/v1/students/me`. */
export interface StudentProfile {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correoInstitucional: string;
  enrollment: StudentEnrollment;
}

/** Real metrics of the dashboard. `null` means "not available", never zero. */
export interface StudentDashboardMetrics {
  generalAverage: number | null;
  averageStatus: AverageStatus;
  attendancePercentage: number | null;
  attendanceStatus: AttendanceAvailability;
  pendingActivities: number;
  submittedActivities: number;
  gradedActivities: number;
}

/** Published activity still pending delivery. */
export interface StudentNextActivity {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  status: SubmissionStatus;
}

/** Latest published grade. */
export interface StudentRecentGrade {
  assessment: string;
  subject: string;
  weight: number;
  grade: number;
}

/** Body of `GET /api/v1/students/me/dashboard`. */
export interface StudentDashboard {
  metrics: StudentDashboardMetrics;
  nextActivities: StudentNextActivity[];
  recentGrades: StudentRecentGrade[];
}

/** Single assessment of a subject. An ungraded assessment has a `null` grade. */
export interface StudentGrade {
  assessmentId: number;
  assessment: string;
  weight: number;
  grade: number | null;
  period: number;
  feedback: string | null;
}

/** Average and breakdown of one subject. */
export interface StudentSubject {
  subject: string;
  average: number | null;
  averageStatus: AverageStatus;
  grades: StudentGrade[];
}

/** Body of `GET /api/v1/students/me/grades`. */
export interface StudentGrades {
  generalAverage: number | null;
  averageStatus: AverageStatus;
  subjects: StudentSubject[];
}

/** Published activity of the groups of the student. */
export interface StudentActivity {
  id: number;
  title: string;
  subject: string;
  dueDate: string;
  description: string;
  status: SubmissionStatus;
  grade: number | null;
  feedback: string | null;
}

/** Body of `GET /api/v1/students/me/activities` (only published activities). */
export interface StudentActivities {
  activities: StudentActivity[];
}

/** Delivery of the student with its derived state. */
export interface StudentSubmission {
  id: number;
  activityId: number;
  title: string;
  subject: string;
  submittedAt: string;
  status: SubmissionStatus;
  grade: number | null;
  feedback: string | null;
}

/** Body of `GET /api/v1/students/me/submissions`. */
export interface StudentSubmissions {
  submissions: StudentSubmission[];
}

/** Single attendance record. */
export interface StudentAttendanceRecord {
  assignmentId: number;
  subject: string;
  date: string;
  status: AttendanceStatus;
}

/** Body of `GET /api/v1/students/me/attendance`. */
export interface StudentAttendance {
  percentage: number | null;
  records: StudentAttendanceRecord[];
}

/** Body of `POST /api/v1/activities/{id}/submissions`: at least one field is required. */
export interface SubmissionPayload {
  contenido?: string;
  archivoRef?: string;
}
