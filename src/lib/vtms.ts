import { ExamRules, examRulesFromJson } from "@/lib/vtmsEligibility";

export type AssignmentRole = "course_admin" | "supervisor";
export type LifecycleStatus = "active" | "completed" | "archived";
export type TaskSubmissionStatus = "submitted" | "under_review" | "reviewed" | "revision_required";
export type ProjectStatus = "not_started" | "in_progress" | "submitted" | "under_review" | "revision_required" | "approved";
export type ExamStatus = "applied" | "under_review" | "approved" | "rejected" | "scheduled" | "completed" | "passed" | "failed";
export type ActivityType =
  | "student_reviewed"
  | "project_reviewed"
  | "feedback_submitted"
  | "task_assessed"
  | "progress_report_submitted"
  | "exam_readiness_confirmed"
  | "exam_readiness_revoked";

export interface CourseStaff {
  id: string;
  courseId: string;
  userId: string;
  assignmentRole: AssignmentRole;
  assignedBy: string | null;
  createdAt: string;
}

export interface StoredFile {
  name: string;
  path: string;
}

export interface CourseTask {
  id: string;
  courseId: string;
  title: string;
  description: string;
  instructions: string;
  deadline: string | null;
  marks: number | null;
  assessmentCriteria: string;
  submissionRequirements: string;
  attachments: StoredFile[];
  createdBy: string | null;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  studentId: string;
  content: string;
  attachments: StoredFile[];
  status: TaskSubmissionStatus;
  feedback: string;
  score: number | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string;
}

export interface CourseProject {
  id: string;
  courseId: string;
  title: string;
  description: string;
  objectives: string;
  requirements: string;
  deadline: string | null;
  attachments: StoredFile[];
  createdBy: string | null;
  createdAt: string;
}

export interface ProjectSubmission {
  id: string;
  projectId: string;
  studentId: string;
  content: string;
  attachments: StoredFile[];
  status: ProjectStatus;
  supervisorFeedback: string;
  adminAssessment: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
}

export interface SupervisorActivity {
  id: string;
  courseId: string;
  supervisorId: string;
  studentId: string | null;
  activityType: ActivityType;
  summary: string;
  relatedId: string | null;
  createdAt: string;
}

export interface ExamApplication {
  id: string;
  courseId: string;
  studentId: string;
  status: ExamStatus;
  decisionNote: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  scheduledAt: string | null;
  scheduleNote: string;
  score: number | null;
  resultNote: string;
  appliedAt: string;
}

export interface Examination {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: string | null;
  instructions: string;
}

export interface ExamResult {
  id: string;
  applicationId: string;
  courseId: string;
  studentId: string;
  score: number | null;
  outcome: "passed" | "failed";
  note: string;
  recordedAt: string;
}

export interface CourseEnrolmentRow {
  studentId: string;
  courseId: string;
  completedLessonIds: string[];
  certificateIssued: boolean;
}

export interface DirectoryPerson {
  id: string;
  fullName: string;
  role: string;
}

export interface CourseTrainingFields {
  startDate?: string;
  endDate?: string;
  learningObjectives?: string;
  requiredSkills?: string;
  whatsappUrl?: string;
  requiredProjectCount: number;
  examEligibility: ExamRules;
  lifecycleStatus: LifecycleStatus;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  under_review: "Under Review",
  revision_required: "Revision Required",
  reviewed: "Reviewed",
  approved: "Approved",
  applied: "Applied",
  rejected: "Rejected",
  scheduled: "Scheduled",
  completed: "Completed",
  passed: "Passed",
  failed: "Failed",
  active: "Active",
  archived: "Archived",
  course_admin: "Course Admin",
  supervisor: "Supervisor",
  student_reviewed: "Student reviewed",
  project_reviewed: "Project reviewed",
  feedback_submitted: "Feedback submitted",
  task_assessed: "Task assessed",
  progress_report_submitted: "Progress report submitted",
  exam_readiness_confirmed: "Examination readiness confirmed",
  exam_readiness_revoked: "Examination readiness revoked",
};

export function statusLabel(value: string) {
  return STATUS_LABELS[value] ?? value;
}

export function filesFromJson(value: unknown): StoredFile[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { name?: unknown; path?: unknown };
    if (typeof row.path !== "string" || !row.path) return [];
    return [{ name: typeof row.name === "string" ? row.name : "File", path: row.path }];
  });
}

export function courseTrainingFromRow(row: {
  start_date?: string | null;
  end_date?: string | null;
  learning_objectives?: string | null;
  required_skills?: string | null;
  whatsapp_url?: string | null;
  required_project_count?: number | null;
  exam_eligibility?: unknown;
  lifecycle_status?: string | null;
}): CourseTrainingFields {
  const lifecycle = row.lifecycle_status;
  return {
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    learningObjectives: row.learning_objectives ?? undefined,
    requiredSkills: row.required_skills ?? undefined,
    whatsappUrl: row.whatsapp_url ?? undefined,
    requiredProjectCount: row.required_project_count ?? 2,
    examEligibility: examRulesFromJson(row.exam_eligibility),
    lifecycleStatus: lifecycle === "completed" || lifecycle === "archived" ? lifecycle : "active",
  };
}

export function mapStaff(row: Record<string, unknown>): CourseStaff {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    userId: String(row.user_id),
    assignmentRole: row.assignment_role === "supervisor" ? "supervisor" : "course_admin",
    assignedBy: row.assigned_by ? String(row.assigned_by) : null,
    createdAt: String(row.created_at),
  };
}

export function mapTask(row: Record<string, unknown>): CourseTask {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    instructions: String(row.instructions ?? ""),
    deadline: row.deadline ? String(row.deadline) : null,
    marks: row.marks == null ? null : Number(row.marks),
    assessmentCriteria: String(row.assessment_criteria ?? ""),
    submissionRequirements: String(row.submission_requirements ?? ""),
    attachments: filesFromJson(row.attachments),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

export function mapTaskSubmission(row: Record<string, unknown>): TaskSubmission {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    studentId: String(row.student_id),
    content: String(row.content ?? ""),
    attachments: filesFromJson(row.attachments),
    status: (row.status as TaskSubmissionStatus) ?? "submitted",
    feedback: String(row.feedback ?? ""),
    score: row.score == null ? null : Number(row.score),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    submittedAt: String(row.submitted_at),
  };
}

export function mapProject(row: Record<string, unknown>): CourseProject {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    objectives: String(row.objectives ?? ""),
    requirements: String(row.requirements ?? ""),
    deadline: row.deadline ? String(row.deadline) : null,
    attachments: filesFromJson(row.attachments),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
  };
}

export function mapProjectSubmission(row: Record<string, unknown>): ProjectSubmission {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    studentId: String(row.student_id),
    content: String(row.content ?? ""),
    attachments: filesFromJson(row.attachments),
    status: (row.status as ProjectStatus) ?? "not_started",
    supervisorFeedback: String(row.supervisor_feedback ?? ""),
    adminAssessment: String(row.admin_assessment ?? ""),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
  };
}

export function mapActivity(row: Record<string, unknown>): SupervisorActivity {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    supervisorId: String(row.supervisor_id),
    studentId: row.student_id ? String(row.student_id) : null,
    activityType: row.activity_type as ActivityType,
    summary: String(row.summary ?? ""),
    relatedId: row.related_id ? String(row.related_id) : null,
    createdAt: String(row.created_at),
  };
}

export function mapApplication(row: Record<string, unknown>): ExamApplication {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    studentId: String(row.student_id),
    status: row.status as ExamStatus,
    decisionNote: String(row.decision_note ?? ""),
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    scheduleNote: String(row.schedule_note ?? ""),
    score: row.score == null ? null : Number(row.score),
    resultNote: String(row.result_note ?? ""),
    appliedAt: String(row.applied_at),
  };
}

export function mapExamination(row: Record<string, unknown>): Examination {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title ?? "Final examination"),
    scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
    instructions: String(row.instructions ?? ""),
  };
}

export function mapResult(row: Record<string, unknown>): ExamResult {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    courseId: String(row.course_id),
    studentId: String(row.student_id),
    score: row.score == null ? null : Number(row.score),
    outcome: row.outcome === "failed" ? "failed" : "passed",
    note: String(row.note ?? ""),
    recordedAt: String(row.recorded_at),
  };
}

export function isSupervisorReady(activity: SupervisorActivity[], courseId: string, studentId: string) {
  const relevant = activity
    .filter(
      (item) =>
        item.courseId === courseId &&
        item.studentId === studentId &&
        (item.activityType === "exam_readiness_confirmed" || item.activityType === "exam_readiness_revoked")
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return relevant[relevant.length - 1]?.activityType === "exam_readiness_confirmed";
}

export function whatsappUrlError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const allowed = url.protocol === "https:" && (url.hostname === "chat.whatsapp.com" || url.hostname === "www.whatsapp.com");
    return allowed ? "" : "Use an https://chat.whatsapp.com invitation link.";
  } catch {
    return "Use an https://chat.whatsapp.com invitation link.";
  }
}

const SUBMISSION_EXTENSIONS = new Set(["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg", "webp", "txt", "mp4"]);

export function submissionFileError(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!SUBMISSION_EXTENSIONS.has(extension)) return "Allowed files: PDF, Word, PowerPoint, images, text, and MP4.";
  if (file.size > 20 * 1024 * 1024) return "File must be 20 MB or smaller.";
  return "";
}

export function missingSchema(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache|could not find the table/i.test(message);
}
