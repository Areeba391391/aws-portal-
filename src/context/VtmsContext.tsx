"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  ActivityType,
  AssignmentRole,
  CourseEnrolmentRow,
  CourseProject,
  CourseStaff,
  CourseTask,
  DirectoryPerson,
  ExamApplication,
  ExamResult,
  ExamStatus,
  Examination,
  ProjectStatus,
  ProjectSubmission,
  StoredFile,
  SupervisorActivity,
  TaskSubmission,
  TaskSubmissionStatus,
  mapActivity,
  mapApplication,
  mapExamination,
  mapProject,
  mapProjectSubmission,
  mapResult,
  mapStaff,
  mapTask,
  mapTaskSubmission,
  missingSchema,
  submissionFileError,
} from "@/lib/vtms";

interface Result {
  error?: string;
}

interface VtmsContextValue {
  ready: boolean;
  migrationRequired: boolean;
  error: string | null;
  staff: CourseStaff[];
  tasks: CourseTask[];
  taskSubmissions: TaskSubmission[];
  projects: CourseProject[];
  projectSubmissions: ProjectSubmission[];
  activity: SupervisorActivity[];
  applications: ExamApplication[];
  examinations: Examination[];
  results: ExamResult[];
  enrolments: CourseEnrolmentRow[];
  directory: DirectoryPerson[];
  refresh: () => Promise<void>;
  assignStaff: (courseId: string, userId: string, assignmentRole: AssignmentRole) => Promise<Result>;
  removeStaff: (id: string) => Promise<Result>;
  createTask: (input: Omit<CourseTask, "id" | "createdAt" | "createdBy" | "attachments"> & { attachments?: StoredFile[] }) => Promise<Result>;
  deleteTask: (id: string) => Promise<Result>;
  submitTask: (taskId: string, content: string, attachments: StoredFile[]) => Promise<Result>;
  reviewTask: (id: string, patch: { status: TaskSubmissionStatus; feedback: string; score: number | null }) => Promise<Result>;
  createProject: (input: Omit<CourseProject, "id" | "createdAt" | "createdBy" | "attachments">) => Promise<Result>;
  deleteProject: (id: string) => Promise<Result>;
  submitProject: (projectId: string, content: string, attachments: StoredFile[], status: "in_progress" | "submitted") => Promise<Result>;
  reviewProject: (id: string, patch: { status: ProjectStatus; supervisorFeedback: string; adminAssessment: string }) => Promise<Result>;
  logActivity: (input: { courseId: string; studentId?: string; activityType: ActivityType; summary: string; relatedId?: string }) => Promise<Result>;
  applyForExam: (courseId: string) => Promise<Result>;
  updateExam: (id: string, patch: Partial<Pick<ExamApplication, "status" | "decisionNote" | "scheduledAt" | "scheduleNote" | "score" | "resultNote">>) => Promise<Result>;
  saveExamination: (courseId: string, input: { title: string; scheduledAt: string | null; instructions: string }) => Promise<Result>;
  recordResult: (application: Pick<ExamApplication, "id" | "courseId" | "studentId">, outcome: "passed" | "failed", score: number | null, note: string) => Promise<Result>;
  deleteApplication: (id: string) => Promise<Result>;
  postAnnouncement: (courseId: string, title: string, message: string) => Promise<Result>;
  uploadSubmission: (courseId: string, file: File) => Promise<{ path?: string; name?: string; error?: string }>;
  openSubmission: (path: string) => Promise<{ url?: string; error?: string }>;
}

const VtmsContext = createContext<VtmsContextValue | null>(null);

function personName(directory: DirectoryPerson[], id: string | null | undefined) {
  return directory.find((person) => person.id === id)?.fullName ?? "there";
}

export function VtmsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  const [ready, setReady] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<CourseStaff[]>([]);
  const [tasks, setTasks] = useState<CourseTask[]>([]);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [projects, setProjects] = useState<CourseProject[]>([]);
  const [projectSubmissions, setProjectSubmissions] = useState<ProjectSubmission[]>([]);
  const [activity, setActivity] = useState<SupervisorActivity[]>([]);
  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [enrolments, setEnrolments] = useState<CourseEnrolmentRow[]>([]);
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setStaff([]);
      setTasks([]);
      setTaskSubmissions([]);
      setProjects([]);
      setProjectSubmissions([]);
      setActivity([]);
      setApplications([]);
      setExaminations([]);
      setResults([]);
      setEnrolments([]);
      setDirectory([]);
      setReady(true);
      return;
    }

    const [staffRes, taskRes, taskSubRes, projectRes, projectSubRes, activityRes, appRes, examRes, resultRes, enrolmentRes, peopleRes] =
      await Promise.all([
        supabase.from("course_staff").select("*"),
        supabase.from("course_tasks").select("*").order("created_at", { ascending: true }),
        supabase.from("task_submissions").select("*"),
        supabase.from("course_projects").select("*").order("created_at", { ascending: true }),
        supabase.from("project_submissions").select("*"),
        supabase.from("supervisor_activity").select("*").order("created_at", { ascending: false }),
        supabase.from("exam_applications").select("*").order("applied_at", { ascending: false }),
        supabase.from("examinations").select("*"),
        supabase.from("exam_results").select("*"),
        supabase.from("enrollments").select("student_id, course_id, completed_lesson_ids, certificate_issued"),
        supabase.from("profiles").select("id, full_name, role"),
      ]);

    const firstError = [staffRes, taskRes, taskSubRes, projectRes, projectSubRes, activityRes, appRes, examRes, resultRes].find((res) => res.error)?.error ?? null;
    if (missingSchema(firstError)) {
      setMigrationRequired(true);
      setError(null);
      setReady(true);
      return;
    }
    if (firstError) {
      setError(firstError.message);
      setReady(true);
      return;
    }

    setMigrationRequired(false);
    setError(null);
    setStaff((staffRes.data ?? []).map((row) => mapStaff(row as Record<string, unknown>)));
    setTasks((taskRes.data ?? []).map((row) => mapTask(row as Record<string, unknown>)));
    setTaskSubmissions((taskSubRes.data ?? []).map((row) => mapTaskSubmission(row as Record<string, unknown>)));
    setProjects((projectRes.data ?? []).map((row) => mapProject(row as Record<string, unknown>)));
    setProjectSubmissions((projectSubRes.data ?? []).map((row) => mapProjectSubmission(row as Record<string, unknown>)));
    setActivity((activityRes.data ?? []).map((row) => mapActivity(row as Record<string, unknown>)));
    setApplications((appRes.data ?? []).map((row) => mapApplication(row as Record<string, unknown>)));
    setExaminations((examRes.data ?? []).map((row) => mapExamination(row as Record<string, unknown>)));
    setResults((resultRes.data ?? []).map((row) => mapResult(row as Record<string, unknown>)));
    setEnrolments(
      (enrolmentRes.data ?? []).map((row) => ({
        studentId: String((row as { student_id: string }).student_id),
        courseId: String((row as { course_id: string }).course_id),
        completedLessonIds: ((row as { completed_lesson_ids?: string[] }).completed_lesson_ids) ?? [],
        certificateIssued: Boolean((row as { certificate_issued?: boolean }).certificate_issued),
      }))
    );
    setDirectory(
      (peopleRes.data ?? []).map((row) => ({
        id: String((row as { id: string }).id),
        fullName: String((row as { full_name: string }).full_name),
        role: String((row as { role: string }).role),
      }))
    );
    setReady(true);
  }, [supabase, user]);

  const vtmsLoadedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard") || !user?.id) {
      setReady(true);
      return;
    }
    // Load training records once per signed-in user while they stay in the dashboard.
    if (vtmsLoadedForRef.current === user.id) {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    refresh().then(() => {
      if (!cancelled) {
        vtmsLoadedForRef.current = user.id;
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, user?.id, refresh]);

  async function notify(target: string, title: string, message: string, type: string, link: string) {
    await supabase.rpc("notify_user", { target, n_title: title, n_message: message, n_type: type, n_link: link });
  }

  async function assignStaff(courseId: string, userId: string, assignmentRole: AssignmentRole): Promise<Result> {
    const { data, error: insertError } = await supabase
      .from("course_staff")
      .insert({ course_id: courseId, user_id: userId, assignment_role: assignmentRole, assigned_by: user?.id })
      .select()
      .single();
    if (insertError) return { error: insertError.message };
    setStaff((prev) => [...prev, mapStaff(data as Record<string, unknown>)]);
    const courseLink = `/dashboard/team/training/${courseId}`;
    await notify(userId, "Course assignment", `You were assigned as ${assignmentRole === "course_admin" ? "course admin" : "supervisor"}.`, "course", courseLink);
    return {};
  }

  async function removeStaff(id: string): Promise<Result> {
    const { error: deleteError } = await supabase.from("course_staff").delete().eq("id", id);
    if (deleteError) return { error: deleteError.message };
    setStaff((prev) => prev.filter((item) => item.id !== id));
    return {};
  }

  async function createTask(input: Omit<CourseTask, "id" | "createdAt" | "createdBy" | "attachments"> & { attachments?: StoredFile[] }): Promise<Result> {
    const { data, error: insertError } = await supabase
      .from("course_tasks")
      .insert({
        course_id: input.courseId,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        deadline: input.deadline,
        marks: input.marks,
        assessment_criteria: input.assessmentCriteria,
        submission_requirements: input.submissionRequirements,
        attachments: input.attachments ?? [],
        created_by: user?.id,
      })
      .select()
      .single();
    if (insertError) return { error: insertError.message };
    const created = mapTask(data as Record<string, unknown>);
    setTasks((prev) => [...prev, created]);
    const students = enrolments.filter((row) => row.courseId === input.courseId);
    await Promise.all(
      students.map((row) =>
        notify(row.studentId, "New task", input.title, "task", `/dashboard/student/training/${input.courseId}`)
      )
    );
    return {};
  }

  async function deleteTask(id: string): Promise<Result> {
    const { error: deleteError } = await supabase.from("course_tasks").delete().eq("id", id);
    if (deleteError) return { error: deleteError.message };
    setTasks((prev) => prev.filter((item) => item.id !== id));
    setTaskSubmissions((prev) => prev.filter((item) => item.taskId !== id));
    return {};
  }

  async function submitTask(taskId: string, content: string, attachments: StoredFile[]): Promise<Result> {
    if (!user) return { error: "Sign in required." };
    const existing = taskSubmissions.find((item) => item.taskId === taskId && item.studentId === user.id);
    const payload = { content, attachments, status: "submitted", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const query = existing
      ? supabase.from("task_submissions").update(payload).eq("id", existing.id).select().single()
      : supabase.from("task_submissions").insert({ task_id: taskId, student_id: user.id, ...payload }).select().single();
    const { data, error: writeError } = await query;
    if (writeError) return { error: writeError.message };
    const saved = mapTaskSubmission(data as Record<string, unknown>);
    setTaskSubmissions((prev) => existing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]);
    const task = tasks.find((item) => item.id === taskId);
    if (task) {
      const reviewers = staff.filter((item) => item.courseId === task.courseId);
      await Promise.all(
        reviewers.map((reviewer) =>
          notify(reviewer.userId, "Task submitted", `${user.fullName} submitted ${task.title}.`, "task", `/dashboard/team/training/${task.courseId}`)
        )
      );
    }
    return {};
  }

  async function reviewTask(id: string, patch: { status: TaskSubmissionStatus; feedback: string; score: number | null }): Promise<Result> {
    const current = taskSubmissions.find((item) => item.id === id);
    const task = tasks.find((item) => item.id === current?.taskId);
    const { data, error: writeError } = await supabase
      .from("task_submissions")
      .update({
        status: patch.status,
        feedback: patch.feedback,
        score: patch.score,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (writeError) return { error: writeError.message };
    setTaskSubmissions((prev) => prev.map((item) => (item.id === id ? mapTaskSubmission(data as Record<string, unknown>) : item)));
    if (current && task && user) {
      await supabase.from("supervisor_activity").insert({
        course_id: task.courseId,
        supervisor_id: user.id,
        student_id: current.studentId,
        activity_type: "task_assessed",
        summary: `Assessed “${task.title}” as ${patch.status}.`,
        related_id: id,
      });
      await notify(current.studentId, "Task feedback", patch.feedback || `Your task “${task.title}” was updated.`, "task", `/dashboard/student/training/${task.courseId}`);
      await refresh();
    }
    return {};
  }

  async function createProject(input: Omit<CourseProject, "id" | "createdAt" | "createdBy" | "attachments">): Promise<Result> {
    const { data, error: insertError } = await supabase
      .from("course_projects")
      .insert({
        course_id: input.courseId,
        title: input.title,
        description: input.description,
        objectives: input.objectives,
        requirements: input.requirements,
        deadline: input.deadline,
        created_by: user?.id,
      })
      .select()
      .single();
    if (insertError) return { error: insertError.message };
    setProjects((prev) => [...prev, mapProject(data as Record<string, unknown>)]);
    return {};
  }

  async function deleteProject(id: string): Promise<Result> {
    const { error: deleteError } = await supabase.from("course_projects").delete().eq("id", id);
    if (deleteError) return { error: deleteError.message };
    setProjects((prev) => prev.filter((item) => item.id !== id));
    return {};
  }

  async function submitProject(projectId: string, content: string, attachments: StoredFile[], status: "in_progress" | "submitted"): Promise<Result> {
    if (!user) return { error: "Sign in required." };
    const existing = projectSubmissions.find((item) => item.projectId === projectId && item.studentId === user.id);
    const payload = {
      content,
      attachments,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : existing?.submittedAt,
      updated_at: new Date().toISOString(),
    };
    const query = existing
      ? supabase.from("project_submissions").update(payload).eq("id", existing.id).select().single()
      : supabase.from("project_submissions").insert({ project_id: projectId, student_id: user.id, ...payload }).select().single();
    const { data, error: writeError } = await query;
    if (writeError) return { error: writeError.message };
    const saved = mapProjectSubmission(data as Record<string, unknown>);
    setProjectSubmissions((prev) => existing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]);
    return {};
  }

  async function reviewProject(id: string, patch: { status: ProjectStatus; supervisorFeedback: string; adminAssessment: string }): Promise<Result> {
    const current = projectSubmissions.find((item) => item.id === id);
    const project = projects.find((item) => item.id === current?.projectId);
    const { data, error: writeError } = await supabase
      .from("project_submissions")
      .update({
        status: patch.status,
        supervisor_feedback: patch.supervisorFeedback,
        admin_assessment: patch.adminAssessment,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (writeError) return { error: writeError.message };
    setProjectSubmissions((prev) => prev.map((item) => (item.id === id ? mapProjectSubmission(data as Record<string, unknown>) : item)));
    if (current && project && user) {
      await supabase.from("supervisor_activity").insert({
        course_id: project.courseId,
        supervisor_id: user.id,
        student_id: current.studentId,
        activity_type: patch.status === "approved" ? "project_reviewed" : "feedback_submitted",
        summary: `${patch.status === "approved" ? "Approved" : "Reviewed"} “${project.title}”.`,
        related_id: id,
      });
      await notify(
        current.studentId,
        patch.status === "approved" ? "Project approved" : "Project feedback",
        patch.supervisorFeedback || patch.adminAssessment || `Your project “${project.title}” is ${patch.status}.`,
        "project",
        `/dashboard/student/training/${project.courseId}`
      );
      await refresh();
    }
    return {};
  }

  async function logActivity(input: { courseId: string; studentId?: string; activityType: ActivityType; summary: string; relatedId?: string }): Promise<Result> {
    if (!user) return { error: "Sign in required." };
    const { error: insertError } = await supabase.from("supervisor_activity").insert({
      course_id: input.courseId,
      supervisor_id: user.id,
      student_id: input.studentId ?? null,
      activity_type: input.activityType,
      summary: input.summary,
      related_id: input.relatedId ?? null,
    });
    if (insertError) return { error: insertError.message };
    if (input.studentId && (input.activityType === "exam_readiness_confirmed" || input.activityType === "exam_readiness_revoked")) {
      await notify(input.studentId, "Examination readiness", input.summary, "exam", `/dashboard/student/training/${input.courseId}`);
    }
    await refresh();
    return {};
  }

  async function applyForExam(courseId: string): Promise<Result> {
    if (!user) return { error: "Sign in required." };
    const { error: insertError } = await supabase.from("exam_applications").insert({ course_id: courseId, student_id: user.id, status: "applied" });
    if (insertError) return { error: insertError.message };
    const reviewers = staff.filter((item) => item.courseId === courseId && item.assignmentRole === "course_admin");
    await Promise.all(
      reviewers.map((reviewer) =>
        notify(reviewer.userId, "Examination application", `${user.fullName} applied for the final examination.`, "exam", `/dashboard/team/training/${courseId}`)
      )
    );
    await refresh();
    return {};
  }

  async function updateExam(id: string, patch: Partial<Pick<ExamApplication, "status" | "decisionNote" | "scheduledAt" | "scheduleNote" | "score" | "resultNote">>): Promise<Result> {
    const current = applications.find((item) => item.id === id);
    const { error: writeError } = await supabase
      .from("exam_applications")
      .update({
        status: patch.status,
        decision_note: patch.decisionNote,
        scheduled_at: patch.scheduledAt,
        schedule_note: patch.scheduleNote,
        score: patch.score,
        result_note: patch.resultNote,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (writeError) return { error: writeError.message };
    if (current && patch.status) {
      await notify(current.studentId, "Examination update", `Your examination status is now ${patch.status.replace(/_/g, " ")}.`, "exam", `/dashboard/student/training/${current.courseId}`);
    }
    await refresh();
    return {};
  }

  async function saveExamination(courseId: string, input: { title: string; scheduledAt: string | null; instructions: string }): Promise<Result> {
    const existing = examinations.find((item) => item.courseId === courseId);
    const payload = { title: input.title, scheduled_at: input.scheduledAt, instructions: input.instructions, course_id: courseId, created_by: user?.id };
    const { error: writeError } = existing
      ? await supabase.from("examinations").update(payload).eq("id", existing.id)
      : await supabase.from("examinations").insert(payload);
    if (writeError) return { error: writeError.message };
    await refresh();
    return {};
  }

  async function recordResult(application: Pick<ExamApplication, "id" | "courseId" | "studentId">, outcome: "passed" | "failed", score: number | null, note: string): Promise<Result> {
    const status: ExamStatus = outcome;
    const { error: appError } = await supabase
      .from("exam_applications")
      .update({
        status,
        score,
        result_note: note,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);
    if (appError) return { error: appError.message };
    const existing = results.find((item) => item.applicationId === application.id);
    const resultPayload = {
      application_id: application.id,
      course_id: application.courseId,
      student_id: application.studentId,
      score,
      outcome,
      note,
      recorded_by: user?.id,
      recorded_at: new Date().toISOString(),
    };
    const { error: resultError } = existing
      ? await supabase.from("exam_results").update(resultPayload).eq("id", existing.id)
      : await supabase.from("exam_results").insert(resultPayload);
    if (resultError) return { error: resultError.message };
    await notify(application.studentId, "Examination result", `Your final examination result is ${outcome}.`, "exam", `/dashboard/student/training/${application.courseId}`);
    await refresh();
    return {};
  }

  async function deleteApplication(id: string): Promise<Result> {
    const { error: deleteError } = await supabase.from("exam_applications").delete().eq("id", id);
    if (deleteError) return { error: deleteError.message };
    await refresh();
    return {};
  }

  async function postAnnouncement(courseId: string, title: string, message: string): Promise<Result> {
    const { error: insertError } = await supabase.from("announcements").insert({
      title,
      message,
      course_id: courseId,
      created_by: user?.id,
      is_active: true,
    });
    if (insertError) return { error: insertError.message };
    const students = enrolments.filter((row) => row.courseId === courseId);
    await Promise.all(students.map((row) => notify(row.studentId, title, message, "announcement", `/dashboard/student/training/${courseId}`)));
    return {};
  }

  async function uploadSubmission(courseId: string, file: File) {
    if (!user) return { error: "Sign in required." };
    const validation = submissionFileError(file);
    if (validation) return { error: validation };
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${courseId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("submissions").upload(path, file, { upsert: false });
    if (uploadError) return { error: uploadError.message };
    return { path, name: file.name };
  }

  async function openSubmission(path: string) {
    const { data, error: signError } = await supabase.storage.from("submissions").createSignedUrl(path, 120);
    if (signError || !data?.signedUrl) return { error: signError?.message ?? "Could not open this file." };
    return { url: data.signedUrl };
  }

  const value: VtmsContextValue = {
    ready,
    migrationRequired,
    error,
    staff,
    tasks,
    taskSubmissions,
    projects,
    projectSubmissions,
    activity,
    applications,
    examinations,
    results,
    enrolments,
    directory,
    refresh,
    assignStaff,
    removeStaff,
    createTask,
    deleteTask,
    submitTask,
    reviewTask,
    createProject,
    deleteProject,
    submitProject,
    reviewProject,
    logActivity,
    applyForExam,
    updateExam,
    saveExamination,
    recordResult,
    deleteApplication,
    postAnnouncement,
    uploadSubmission,
    openSubmission,
  };

  return <VtmsContext.Provider value={value}>{children}</VtmsContext.Provider>;
}

export function useVtms() {
  const context = useContext(VtmsContext);
  if (!context) throw new Error("useVtms must be used within VtmsProvider");
  return context;
}

export { personName };
