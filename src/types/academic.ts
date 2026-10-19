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

/* ------------------------------------------------------------------------------------------------
 * Teacher workspace (mirror of `com.sigea.teacherworkspace.dto`)
 * ---------------------------------------------------------------------------------------------- */

/** Publication state of an activity. */
export type ActivityStatus = "BORRADOR" | "PUBLICADA";

/** Level of a grade, used by the Spanish copy of the screens. */
export type GradeLevel = "Bajo" | "Medio" | "Alto";

/** Teaching assignment of the professor of the session. */
export interface TeacherAssignment {
  id: number;
  subject: string;
  grade: string;
  group: string;
  academicYear: number;
  period: number | null;
  studentCount: number;
}

/** Body of `GET /api/v1/teachers/me/assignments`. */
export interface TeacherAssignments {
  assignments: TeacherAssignment[];
}

/** Student enrolled in the group of an assignment, with the metrics of that assignment. */
export interface TeacherStudent {
  id: number;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  average: number | null;
  averageStatus: AverageStatus;
  attendancePercentage: number | null;
}

/** Assignment header of the student list. */
export interface AssignmentSummary {
  id: number;
  subject: string;
  grade: string;
  group: string;
  academicYear: number;
}

/** Body of `GET /api/v1/assignments/{id}/students`. */
export interface AssignmentStudents {
  assignment: AssignmentSummary;
  students: TeacherStudent[];
}

/** Single attendance record of a session. */
export interface TeacherAttendanceRecord {
  studentId: number;
  status: AttendanceStatus;
}

/** Body of `GET`/`POST /api/v1/assignments/{id}/attendance`. */
export interface TeacherAttendance {
  assignmentId: number;
  date: string;
  records: TeacherAttendanceRecord[];
}

/** Body of `POST /api/v1/assignments/{id}/attendance`. */
export interface AttendancePayload {
  date: string;
  records: TeacherAttendanceRecord[];
}

/** Activity as the professor sees it. */
export interface TeacherActivity {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  status: ActivityStatus;
}

/** Body of `GET /api/v1/assignments/{id}/activities` (drafts included). */
export interface AssignmentActivities {
  assignmentId: number;
  activities: TeacherActivity[];
}

/** Body of `POST /api/v1/assignments/{id}/activities`. */
export interface ActivityPayload {
  title: string;
  description: string;
  dueDate: string;
  status: ActivityStatus;
}

/** Delivery of an activity as the professor sees it. */
export interface TeacherSubmission {
  id: number;
  studentId: number;
  studentName: string;
  submittedAt: string;
  content: string;
  status: SubmissionStatus;
  grade: number | null;
  feedback: string | null;
}

/** Header of the deliveries list. */
export interface ActivityHeader {
  id: number;
  title: string;
  dueDate: string;
}

/** Body of `GET /api/v1/activities/{id}/submissions`. */
export interface ActivitySubmissions {
  activity: ActivityHeader;
  submissions: TeacherSubmission[];
}

/** Body of `PATCH /api/v1/submissions/{id}/grade`. */
export interface GradeSubmissionPayload {
  grade: number;
  feedback?: string;
}

/** Assessment as the professor sees it. */
export interface TeacherAssessment {
  id: number;
  name: string;
  weight: number;
  period: number | null;
  active: boolean;
}

/** Body of `POST /api/v1/assignments/{id}/assessments`. */
export interface AssessmentPayload {
  name: string;
  weight: number;
  period: number;
}

/** Body of `GET /api/v1/assignments/{id}/assessments`. */
export interface AssignmentAssessments {
  assignmentId: number;
  accumulatedWeight: number;
  assessments: TeacherAssessment[];
}

/** Grade of one student in one assessment; `null` when the student has no grade. */
export interface AssessmentGradeRecord {
  studentId: number;
  studentName: string;
  grade: number | null;
}

/** Body of `GET /api/v1/assessments/{id}/grades`. */
export interface AssessmentGrades {
  assessmentId: number;
  records: AssessmentGradeRecord[];
}

/** Persisted grade of one student in one assessment. */
export interface AssessmentGrade {
  id: number;
  studentId: number;
  grade: number;
}

/** Body of `POST /api/v1/assessments/{id}/grades`. */
export interface GradeBatch {
  assessmentId: number;
  grades: AssessmentGrade[];
}

/** Body of `POST /api/v1/assessments/{id}/grades`. */
export interface GradeBatchPayload {
  records: Array<{ studentId: number; grade: number }>;
}
