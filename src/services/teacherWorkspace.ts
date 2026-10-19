import { httpClient } from "@/services/http";
import type { HttpClient } from "@/services/http";
import type {
  ActivityPayload,
  ActivitySubmissions,
  AssessmentGrades,
  AssessmentPayload,
  AssignmentActivities,
  AssignmentAssessments,
  AssignmentStudents,
  AttendancePayload,
  GradeBatch,
  GradeBatchPayload,
  GradeSubmissionPayload,
  TeacherActivity,
  TeacherAssignments,
  TeacherAssessment,
  TeacherAttendance,
  TeacherSubmission,
} from "@/types/academic";

/** Base path of the teacher workspace capability in the SIGEA API. */
export const TEACHER_WORKSPACE_BASE_PATH = "/api/v1";

/**
 * Surface of the teacher workspace consumed by the screens. The interface exists so the tests can
 * inject a fake (`vi.fn()`) instead of hitting the real API.
 */
export interface TeacherWorkspaceApi {
  /** Teaching assignments of the professor of the session. */
  getAssignments(accessToken: string): Promise<TeacherAssignments>;
  /** Students enrolled in the group of an assignment of the professor. */
  getStudents(assignmentId: number, accessToken: string): Promise<AssignmentStudents>;
  /** Attendance records of one session of an assignment. */
  getAttendance(assignmentId: number, date: string, accessToken: string): Promise<TeacherAttendance>;
  /** Every activity of an assignment, drafts included. */
  getActivities(assignmentId: number, accessToken: string): Promise<AssignmentActivities>;
  /** Registers (or updates) the attendance of one session. */
  saveAttendance(
    assignmentId: number,
    payload: AttendancePayload,
    accessToken: string,
  ): Promise<TeacherAttendance>;
  /** Creates an activity in draft or published state. */
  createActivity(
    assignmentId: number,
    payload: ActivityPayload,
    accessToken: string,
  ): Promise<TeacherActivity>;
  /** Publishes an activity; the operation is idempotent. */
  publishActivity(activityId: number, accessToken: string): Promise<TeacherActivity>;
  /** Deliveries of an activity of the professor. */
  getSubmissions(activityId: number, accessToken: string): Promise<ActivitySubmissions>;
  /** Grades a single delivery with its feedback. */
  gradeSubmission(
    submissionId: number,
    payload: GradeSubmissionPayload,
    accessToken: string,
  ): Promise<TeacherSubmission>;
  /** Creates an assessment of an assignment. */
  createAssessment(
    assignmentId: number,
    payload: AssessmentPayload,
    accessToken: string,
  ): Promise<TeacherAssessment>;
  /** Every assessment of an assignment plus the weight accumulated by the backend. */
  getAssessments(assignmentId: number, accessToken: string): Promise<AssignmentAssessments>;
  /** Recorded grades of one assessment; a missing grade travels as `null`. */
  getAssessmentGrades(assessmentId: number, accessToken: string): Promise<AssessmentGrades>;
  /** Records (or updates) the grades of a group in one assessment. */
  saveGrades(assessmentId: number, payload: GradeBatchPayload, accessToken: string): Promise<GradeBatch>;
}

/** Creates a client bound to a given HTTP client (or to the default one). */
export function createTeacherWorkspaceApi(client: HttpClient = httpClient): TeacherWorkspaceApi {
  return {
    getAssignments: (accessToken) =>
      client.get<TeacherAssignments>(
        `${TEACHER_WORKSPACE_BASE_PATH}/teachers/me/assignments`,
        accessToken,
      ),
    getStudents: (assignmentId, accessToken) =>
      client.get<AssignmentStudents>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assignments/${assignmentId}/students`,
        accessToken,
      ),
    getAttendance: (assignmentId, date, accessToken) =>
      client.get<TeacherAttendance>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assignments/${assignmentId}/attendance?date=${encodeURIComponent(date)}`,
        accessToken,
      ),
    getActivities: (assignmentId, accessToken) =>
      client.get<AssignmentActivities>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assignments/${assignmentId}/activities`,
        accessToken,
      ),
    saveAttendance: (assignmentId, payload, accessToken) =>
      client.post<TeacherAttendance>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assignments/${assignmentId}/attendance`,
        payload,
        accessToken,
      ),
    createActivity: (assignmentId, payload, accessToken) =>
      client.post<TeacherActivity>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assignments/${assignmentId}/activities`,
        payload,
        accessToken,
      ),
    publishActivity: (activityId, accessToken) =>
      client.patch<TeacherActivity>(
        `${TEACHER_WORKSPACE_BASE_PATH}/activities/${activityId}/publish`,
        undefined,
        accessToken,
      ),
    getSubmissions: (activityId, accessToken) =>
      client.get<ActivitySubmissions>(
        `${TEACHER_WORKSPACE_BASE_PATH}/activities/${activityId}/submissions`,
        accessToken,
      ),
    gradeSubmission: (submissionId, payload, accessToken) =>
      client.patch<TeacherSubmission>(
        `${TEACHER_WORKSPACE_BASE_PATH}/submissions/${submissionId}/grade`,
        payload,
        accessToken,
      ),
    createAssessment: (assignmentId, payload, accessToken) =>
      client.post<TeacherAssessment>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assignments/${assignmentId}/assessments`,
        payload,
        accessToken,
      ),
    getAssessments: (assignmentId, accessToken) =>
      client.get<AssignmentAssessments>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assignments/${assignmentId}/assessments`,
        accessToken,
      ),
    getAssessmentGrades: (assessmentId, accessToken) =>
      client.get<AssessmentGrades>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assessments/${assessmentId}/grades`,
        accessToken,
      ),
    saveGrades: (assessmentId, payload, accessToken) =>
      client.post<GradeBatch>(
        `${TEACHER_WORKSPACE_BASE_PATH}/assessments/${assessmentId}/grades`,
        payload,
        accessToken,
      ),
  };
}

/** Default API client used by the application. */
export const teacherWorkspaceApi: TeacherWorkspaceApi = createTeacherWorkspaceApi();
