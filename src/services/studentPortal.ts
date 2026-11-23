import { httpClient } from "@/services/http";
import type { HttpClient } from "@/services/http";
import type {
  StudentActivities,
  StudentAttendance,
  StudentDashboard,
  StudentGrades,
  StudentProfile,
  StudentSubmission,
  StudentSubmissions,
  SubmissionPayload,
} from "@/types/academic";
import type { FileMetadata } from "@/types/files";

/** Base path of the student portal capability in the SIGEA API. */
export const STUDENT_PORTAL_BASE_PATH = "/api/v1";

/**
 * Surface of the student portal consumed by the screens. The interface exists so the tests can
 * inject a fake (`vi.fn()`) instead of hitting the real API.
 */
export interface StudentPortalApi {
  /** Identity and active enrollment of the student behind the session. */
  getMe(accessToken: string): Promise<StudentProfile>;
  /** Real metrics, next activities and latest grades. */
  getDashboard(accessToken: string): Promise<StudentDashboard>;
  /** General average and breakdown by subject. */
  getGrades(accessToken: string): Promise<StudentGrades>;
  /** Published activities of the groups of the student. */
  getActivities(accessToken: string): Promise<StudentActivities>;
  /** Delivery history of the student. */
  getSubmissions(accessToken: string): Promise<StudentSubmissions>;
  /** Attendance records and percentage of the student. */
  getAttendance(accessToken: string): Promise<StudentAttendance>;
  /** Registers the single delivery of a published activity. */
  submitActivity(
    activityId: number,
    payload: SubmissionPayload,
    accessToken: string,
  ): Promise<StudentSubmission>;
  /** Replaces the content and/or the file reference of an existing, still open delivery. */
  resubmit(
    submissionId: number,
    payload: SubmissionPayload,
    accessToken: string,
  ): Promise<StudentSubmission>;
  /** Attaches several files to a delivery in a single request. */
  uploadFiles(
    submissionId: number,
    files: File[],
    accessToken: string,
  ): Promise<FileMetadata[]>;
  getFiles(submissionId: number, accessToken: string): Promise<FileMetadata[]>;
  deleteFile(submissionId: number, fileId: number, accessToken: string): Promise<void>;
  /** Raw bytes of an attachment, fetched with the session token. */
  getFileBlob(
    fileId: number,
    accessToken: string,
    kind?: "preview" | "download",
  ): Promise<Blob>;
}

/** Creates a client bound to a given HTTP client (or to the default one). */
export function createStudentPortalApi(client: HttpClient = httpClient): StudentPortalApi {
  return {
    getMe: (accessToken) =>
      client.get<StudentProfile>(`${STUDENT_PORTAL_BASE_PATH}/students/me`, accessToken),
    getDashboard: (accessToken) =>
      client.get<StudentDashboard>(`${STUDENT_PORTAL_BASE_PATH}/students/me/dashboard`, accessToken),
    getGrades: (accessToken) =>
      client.get<StudentGrades>(`${STUDENT_PORTAL_BASE_PATH}/students/me/grades`, accessToken),
    getActivities: (accessToken) =>
      client.get<StudentActivities>(`${STUDENT_PORTAL_BASE_PATH}/students/me/activities`, accessToken),
    getSubmissions: (accessToken) =>
      client.get<StudentSubmissions>(
        `${STUDENT_PORTAL_BASE_PATH}/students/me/submissions`,
        accessToken,
      ),
    getAttendance: (accessToken) =>
      client.get<StudentAttendance>(
        `${STUDENT_PORTAL_BASE_PATH}/students/me/attendance`,
        accessToken,
      ),
    submitActivity: (activityId, payload, accessToken) =>
      client.post<StudentSubmission>(
        `${STUDENT_PORTAL_BASE_PATH}/activities/${activityId}/submissions`,
        payload,
        accessToken,
      ),
    resubmit: (submissionId, payload, accessToken) =>
      client.patch<StudentSubmission>(
        `${STUDENT_PORTAL_BASE_PATH}/students/me/deliveries/${submissionId}`,
        payload,
        accessToken,
      ),
    uploadFiles: (submissionId, files, accessToken) => {
      const formData = new FormData();
      // The backend reads every part named `file`, so one request carries the whole batch.
      for (const file of files) {
        formData.append("file", file);
      }
      return client.postForm<FileMetadata[]>(
        `${STUDENT_PORTAL_BASE_PATH}/students/me/deliveries/${submissionId}/files`,
        formData,
        accessToken,
      );
    },
    getFileBlob: (fileId, accessToken, kind = "preview") =>
      client.blob(
        kind === "preview" ? `/api/v1/files/${fileId}/preview` : `/api/v1/files/${fileId}`,
        accessToken,
      ),
    getFiles: (submissionId, accessToken) =>
      client.get<FileMetadata[]>(
        `${STUDENT_PORTAL_BASE_PATH}/students/me/deliveries/${submissionId}/files`,
        accessToken,
      ),
    deleteFile: (submissionId, fileId, accessToken) =>
      client.delete(
        `${STUDENT_PORTAL_BASE_PATH}/students/me/deliveries/${submissionId}/files/${fileId}`,
        undefined,
        accessToken,
      ),
  };
}

/** Default API client used by the application. */
export const studentPortalApi: StudentPortalApi = createStudentPortalApi();
