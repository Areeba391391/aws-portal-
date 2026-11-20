"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileUploadInput } from "@/components/FileUploadInput";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useEnrollment } from "@/context/EnrollmentContext";
import { useVtms } from "@/context/VtmsContext";
import { evaluateExamEligibility, trainingProgress } from "@/lib/vtmsEligibility";
import {
  CourseProject,
  CourseTask,
  ProjectStatus,
  TaskSubmissionStatus,
  isSupervisorReady,
  statusLabel,
  whatsappUrlError,
} from "@/lib/vtms";
import { ResourceType } from "@/types";
import { MigrationNotice } from "@/components/vtms/TrainingList";

const TABS = ["Overview", "Description", "Materials", "Tasks", "Projects", "Students", "Supervisor", "WhatsApp", "Progress", "Examination"] as const;
type Tab = (typeof TABS)[number];

export function CourseWorkspace({ courseId, audience }: { courseId: string; audience: "admin" | "team" | "student" }) {
  const { courses, resources, addResource, updateCourse, refresh } = useData();
  const { user, users } = useAuth();
  const { isEnrolled, enroll } = useEnrollment();
  const vtms = useVtms();
  const [tab, setTab] = useState<Tab>("Overview");
  const [notice, setNotice] = useState("");
  const [problem, setProblem] = useState("");

  const course = courses.find((item) => item.id === courseId);
  const myRoles = vtms.staff.filter((item) => item.courseId === courseId && item.userId === user?.id);
  const canManage = audience === "admin" || myRoles.some((item) => item.assignmentRole === "course_admin");
  const canReview = canManage || myRoles.some((item) => item.assignmentRole === "supervisor");
  const enrolled = user ? isEnrolled(courseId) || vtms.enrolments.some((item) => item.courseId === courseId && item.studentId === user.id) : false;

  function flash(error?: string) {
    if (error) {
      setProblem(error);
      setNotice("");
      return;
    }
    setProblem("");
    setNotice("Saved.");
  }

  if (!vtms.ready) return <p className="text-sm text-paragraph-light dark:text-paragraph-dark">Loading training records…</p>;
  if (vtms.migrationRequired) return <MigrationNotice />;
  if (!course) return <p className="text-sm text-paragraph-light dark:text-paragraph-dark">Course not found.</p>;
  if (audience === "team" && !canReview) {
    return (
      <div className="card-surface p-6 max-w-xl">
        <h1 className="text-xl font-bold text-heading-light dark:text-heading-dark">Not assigned</h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-2">You can open a course only when a super admin assigns you to it.</p>
        <Link href="/dashboard/team/training" className="text-orange font-semibold text-sm mt-3 inline-block">Back to Training</Link>
      </div>
    );
  }
  if (audience === "student" && !enrolled) {
    return (
      <div className="card-surface p-8 max-w-lg text-center">
        <h1 className="text-lg font-bold text-heading-light dark:text-heading-dark">Enrol to open training</h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-2">{course.title}</p>
        <button onClick={() => enroll(courseId)} className="btn-primary mt-5">Enrol Now</button>
      </div>
    );
  }

  const courseTasks = vtms.tasks.filter((item) => item.courseId === courseId);
  const courseProjects = vtms.projects.filter((item) => item.courseId === courseId);
  const courseStaff = vtms.staff.filter((item) => item.courseId === courseId);
  const courseEnrolments = vtms.enrolments.filter((item) => item.courseId === courseId);
  const courseActivity = vtms.activity.filter((item) => item.courseId === courseId);
  const materials = resources.filter((item) => item.courseId === courseId).slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href={`/dashboard/${audience}/training`} className="text-sm text-paragraph-light dark:text-paragraph-dark hover:text-orange">← Training</Link>
        <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark mt-2">{course.title}</h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">{course.level}{course.category ? ` · ${course.category}` : ""}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setTab(item); setNotice(""); setProblem(""); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${tab === item ? "bg-orange text-white" : "bg-bg-light dark:bg-white/10 text-paragraph-light dark:text-paragraph-dark"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {notice && <p className="text-sm text-emerald-500">{notice}</p>}
      {problem && <p className="text-sm text-red-500">{problem}</p>}

      {tab === "Overview" && (
        <Overview
          students={courseEnrolments.length}
          tasks={courseTasks.length}
          projects={courseProjects.length}
          pendingTasks={vtms.taskSubmissions.filter((item) => courseTasks.some((task) => task.id === item.taskId) && (item.status === "submitted" || item.status === "under_review")).length}
          pendingProjects={vtms.projectSubmissions.filter((item) => courseProjects.some((project) => project.id === item.projectId) && (item.status === "submitted" || item.status === "under_review")).length}
          pendingExams={vtms.applications.filter((item) => item.courseId === courseId && (item.status === "applied" || item.status === "under_review")).length}
          activity={courseActivity.slice(0, 6)}
          directory={vtms.directory}
          canManage={canManage}
          onAnnounce={async (title, message) => flash((await vtms.postAnnouncement(courseId, title, message)).error)}
        />
      )}
      {tab === "Description" && (
        <Description course={course} canManage={canManage} onSave={async (patch) => { const result = await updateCourse(courseId, patch); if (!result.error) await refresh(); flash(result.error); }} />
      )}
      {tab === "Materials" && (
        <Materials
          materials={materials}
          canManage={canManage}
          onAdd={async (file) => {
            await addResource({
              title: file.title,
              description: file.description,
              type: file.type,
              url: file.url,
              size: file.size,
              courseId,
              visibility: "Enrolled Students",
              downloadAllowed: true,
              previewAllowed: true,
              uploadedBy: user?.fullName ?? "Staff",
              materialCategory: file.category,
              displayOrder: materials.length + 1,
            });
            setNotice("Material added.");
          }}
        />
      )}
      {tab === "Tasks" && (
        <Tasks
          tasks={courseTasks}
          submissions={vtms.taskSubmissions}
          enrolments={courseEnrolments}
          directory={vtms.directory}
          canManage={canManage}
          canReview={canReview}
          studentId={audience === "student" ? user?.id : undefined}
          onCreate={(input) => vtms.createTask({ ...input, courseId }).then((result) => flash(result.error))}
          onDelete={(id) => vtms.deleteTask(id).then((result) => flash(result.error))}
          onSubmit={(taskId, content, files) => uploadThen(files, courseId, vtms.uploadSubmission).then(async (uploaded) => {
            if (uploaded.error) return flash(uploaded.error);
            flash((await vtms.submitTask(taskId, content, uploaded.files)).error);
          })}
          onReview={(id, patch) => vtms.reviewTask(id, patch).then((result) => flash(result.error))}
          onOpen={vtms.openSubmission}
        />
      )}
      {tab === "Projects" && (
        <Projects
          projects={courseProjects}
          submissions={vtms.projectSubmissions}
          enrolments={courseEnrolments}
          directory={vtms.directory}
          canManage={canManage}
          canReview={canReview}
          studentId={audience === "student" ? user?.id : undefined}
          onCreate={(input) => vtms.createProject({ ...input, courseId }).then((result) => flash(result.error))}
          onDelete={(id) => vtms.deleteProject(id).then((result) => flash(result.error))}
          onSubmit={(projectId, content, files, status) => uploadThen(files, courseId, vtms.uploadSubmission).then(async (uploaded) => {
            if (uploaded.error) return flash(uploaded.error);
            flash((await vtms.submitProject(projectId, content, uploaded.files, status)).error);
          })}
          onReview={(id, patch) => vtms.reviewProject(id, patch).then((result) => flash(result.error))}
          onOpen={vtms.openSubmission}
        />
      )}
      {tab === "Students" && <Students enrolments={courseEnrolments} directory={vtms.directory} tasks={courseTasks} projects={courseProjects} submissions={vtms.taskSubmissions} projectSubmissions={vtms.projectSubmissions} requiredProjects={course.requiredProjectCount ?? 2} />}
      {tab === "Supervisor" && (
        <Supervisor
          staff={courseStaff}
          directory={vtms.directory}
          users={users.filter((item) => item.role === "team" || item.role === "admin")}
          canAssign={audience === "admin"}
          onAssign={(userId, role) => vtms.assignStaff(courseId, userId, role).then((result) => flash(result.error))}
          onRemove={(id) => vtms.removeStaff(id).then((result) => flash(result.error))}
        />
      )}
      {tab === "WhatsApp" && (
        <WhatsApp
          url={course.whatsappUrl ?? ""}
          supervisors={courseStaff.filter((item) => item.assignmentRole === "supervisor")}
          directory={vtms.directory}
          canManage={canManage}
          onSave={async (url) => {
            const invalid = whatsappUrlError(url);
            if (invalid) return flash(invalid);
            const result = await updateCourse(courseId, { whatsappUrl: url.trim() || undefined });
            flash(result.error);
          }}
        />
      )}
      {tab === "Progress" && (
        <Progress
          enrolments={courseEnrolments}
          directory={vtms.directory}
          tasks={courseTasks}
          projects={courseProjects}
          taskSubmissions={vtms.taskSubmissions}
          projectSubmissions={vtms.projectSubmissions}
          activity={courseActivity}
          requiredProjects={course.requiredProjectCount ?? 2}
          studentId={audience === "student" ? user?.id : undefined}
        />
      )}
      {tab === "Examination" && (
        <Examination
          courseId={courseId}
          rules={course.examEligibility ?? { requireTasks: true, requireProjects: true, requireSupervisorReady: true }}
          requiredProjects={course.requiredProjectCount ?? 2}
          tasks={courseTasks}
          projects={courseProjects}
          taskSubmissions={vtms.taskSubmissions}
          projectSubmissions={vtms.projectSubmissions}
          activity={courseActivity}
          applications={vtms.applications.filter((item) => item.courseId === courseId)}
          examination={vtms.examinations.find((item) => item.courseId === courseId)}
          enrolments={courseEnrolments}
          directory={vtms.directory}
          studentId={audience === "student" ? user?.id : undefined}
          canReview={canReview}
          canManage={canManage}
          canSupervise={audience === "admin" || myRoles.some((item) => item.assignmentRole === "supervisor")}
          onApply={() => vtms.applyForExam(courseId).then((result) => flash(result.error))}
          onReady={(studentId, ready) => vtms.logActivity({
            courseId,
            studentId,
            activityType: ready ? "exam_readiness_confirmed" : "exam_readiness_revoked",
            summary: ready ? "Examination readiness confirmed." : "Examination readiness revoked.",
          }).then((result) => flash(result.error))}
          onUpdate={(id, patch) => vtms.updateExam(id, patch).then((result) => flash(result.error))}
          onSchedule={(input) => vtms.saveExamination(courseId, input).then((result) => flash(result.error))}
          onResult={(application, outcome, score, note) => vtms.recordResult(application, outcome, score, note).then((result) => flash(result.error))}
          onDelete={(id) => vtms.deleteApplication(id).then((result) => flash(result.error))}
          onRules={async (rules) => flash((await updateCourse(courseId, { examEligibility: rules })).error)}
        />
      )}
    </div>
  );
}

async function uploadThen(
  files: File[],
  courseId: string,
  upload: (courseId: string, file: File) => Promise<{ path?: string; name?: string; error?: string }>
) {
  const stored: { name: string; path: string }[] = [];
  for (const file of files) {
    const result = await upload(courseId, file);
    if (result.error || !result.path || !result.name) return { files: stored, error: result.error ?? "Upload failed." };
    stored.push({ name: result.name, path: result.path });
  }
  return { files: stored, error: undefined as string | undefined };
}

function Overview(props: {
  students: number;
  tasks: number;
  projects: number;
  pendingTasks: number;
  pendingProjects: number;
  pendingExams: number;
  activity: { id: string; summary: string; createdAt: string; supervisorId: string; activityType: string }[];
  directory: { id: string; fullName: string }[];
  canManage: boolean;
  onAnnounce: (title: string, message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const cards = [
    ["Enrolled students", props.students],
    ["Tasks", props.tasks],
    ["Projects", props.projects],
    ["Pending task reviews", props.pendingTasks],
    ["Pending project reviews", props.pendingProjects],
    ["Pending examinations", props.pendingExams],
  ] as const;
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card-surface p-5">
            <p className="text-xs text-paragraph-light dark:text-paragraph-dark">{label}</p>
            <p className="text-2xl font-bold font-numbers text-heading-light dark:text-heading-dark mt-1">{value}</p>
          </div>
        ))}
      </div>
      <div className="card-surface p-6">
        <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark mb-4">Recent supervisor activity</h3>
        {props.activity.length === 0 ? <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No supervisor activity recorded yet.</p> : (
          <ul className="space-y-3">
            {props.activity.map((item) => (
              <li key={item.id} className="text-sm">
                <p className="font-medium text-heading-light dark:text-heading-dark">{item.summary}</p>
                <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-1">
                  {statusLabel(item.activityType)} · {props.directory.find((person) => person.id === item.supervisorId)?.fullName ?? "Staff"} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {props.canManage && (
        <form
          className="card-surface p-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim() || !message.trim()) return;
            props.onAnnounce(title.trim(), message.trim());
            setTitle("");
            setMessage("");
          }}
        >
          <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark">Course announcement</h3>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Announcement title" className="input-field" />
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message for enrolled students" rows={3} className="input-field resize-none" />
          <button className="btn-primary !py-2.5 !px-5 text-sm" type="submit">Publish</button>
        </form>
      )}
    </div>
  );
}

function Description({
  course,
  canManage,
  onSave,
}: {
  course: { learningObjectives?: string; requiredSkills?: string; startDate?: string; endDate?: string; requiredProjectCount?: number; lifecycleStatus?: "active" | "completed" | "archived"; description: string };
  canManage: boolean;
  onSave: (patch: { learningObjectives: string; requiredSkills: string; startDate?: string; endDate?: string; requiredProjectCount: number; lifecycleStatus: "active" | "completed" | "archived"; status?: "Active" | "Draft" }) => void;
}) {
  const [form, setForm] = useState({
    learningObjectives: course.learningObjectives ?? "",
    requiredSkills: course.requiredSkills ?? "",
    startDate: course.startDate ?? "",
    endDate: course.endDate ?? "",
    requiredProjectCount: course.requiredProjectCount ?? 2,
    lifecycleStatus: course.lifecycleStatus ?? "active" as "active" | "completed" | "archived",
  });
  useEffect(() => {
    setForm({
      learningObjectives: course.learningObjectives ?? "",
      requiredSkills: course.requiredSkills ?? "",
      startDate: course.startDate ?? "",
      endDate: course.endDate ?? "",
      requiredProjectCount: course.requiredProjectCount ?? 2,
      lifecycleStatus: course.lifecycleStatus ?? "active",
    });
  }, [course.learningObjectives, course.requiredSkills, course.startDate, course.endDate, course.requiredProjectCount, course.lifecycleStatus]);

  return (
    <form
      className="card-surface p-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          learningObjectives: form.learningObjectives,
          requiredSkills: form.requiredSkills,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          requiredProjectCount: Number(form.requiredProjectCount),
          lifecycleStatus: form.lifecycleStatus,
          status: form.lifecycleStatus === "archived" ? "Draft" : undefined,
        });
      }}
    >
      <p className="text-sm text-paragraph-light dark:text-paragraph-dark">{course.description}</p>
      <label className="block text-sm font-medium">Learning objectives<textarea value={form.learningObjectives} onChange={(event) => setForm({ ...form, learningObjectives: event.target.value })} rows={4} className="input-field mt-2 resize-none" disabled={!canManage} /></label>
      <label className="block text-sm font-medium">Required skills<textarea value={form.requiredSkills} onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })} rows={3} className="input-field mt-2 resize-none" disabled={!canManage} /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="input-field mt-2" disabled={!canManage} /></label>
        <label className="block text-sm font-medium">End date<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="input-field mt-2" disabled={!canManage} /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">Required approved projects
          <input type="number" min={1} max={6} value={form.requiredProjectCount} onChange={(event) => setForm({ ...form, requiredProjectCount: Number(event.target.value) })} className="input-field mt-2" disabled={!canManage} />
        </label>
        <label className="block text-sm font-medium">Lifecycle
          <select value={form.lifecycleStatus} onChange={(event) => setForm({ ...form, lifecycleStatus: event.target.value as "active" | "completed" | "archived" })} className="select-field mt-2" disabled={!canManage}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-paragraph-light dark:text-paragraph-dark">Public visibility stays on Courses & Resources as Active or Draft. Choosing Archived also sets the course to Draft.</p>
      {canManage && <button className="btn-primary !py-2.5 !px-5 text-sm" type="submit">Save description</button>}
    </form>
  );
}

function Materials({
  materials,
  canManage,
  onAdd,
}: {
  materials: { id: string; title: string; type: string; url: string; materialCategory?: string; description?: string }[];
  canManage: boolean;
  onAdd: (file: { title: string; description: string; type: ResourceType; url: string; size: string; category: string }) => void;
}) {
  const [category, setCategory] = useState("Reference");
  const [file, setFile] = useState<{ title: string; url: string; size: string; type: ResourceType } | null>(null);
  return (
    <div className="card-surface p-6 space-y-4">
      {materials.length === 0 && <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No training materials uploaded for this course yet.</p>}
      {materials.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-3 text-sm border-b border-border-light dark:border-border-dark pb-3">
          <div>
            <p className="font-medium text-heading-light dark:text-heading-dark">{item.title}</p>
            <p className="text-xs text-paragraph-light dark:text-paragraph-dark">{item.materialCategory || "Material"} · {item.type}</p>
          </div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-orange font-semibold text-xs">Open</a>
        </div>
      ))}
      {canManage && (
        <div className="space-y-3 pt-2">
          <input value={category} onChange={(event) => setCategory(event.target.value)} className="input-field" placeholder="Category" />
          <FileUploadInput onFile={(next) => setFile(next)} />
          <button
            type="button"
            disabled={!file?.url}
            className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-40"
            onClick={() => file && onAdd({ ...file, description: "", category })}
          >
            Add material
          </button>
        </div>
      )}
    </div>
  );
}

function Tasks(props: {
  tasks: CourseTask[];
  submissions: { id: string; taskId: string; studentId: string; content: string; status: TaskSubmissionStatus; feedback: string; score: number | null; attachments: { name: string; path: string }[] }[];
  enrolments: { studentId: string }[];
  directory: { id: string; fullName: string }[];
  canManage: boolean;
  canReview: boolean;
  studentId?: string;
  onCreate: (input: Omit<CourseTask, "id" | "courseId" | "createdAt" | "createdBy" | "attachments">) => void;
  onDelete: (id: string) => void;
  onSubmit: (taskId: string, content: string, files: File[]) => void;
  onReview: (id: string, patch: { status: TaskSubmissionStatus; feedback: string; score: number | null }) => void;
  onOpen: (path: string) => Promise<{ url?: string; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", instructions: "", deadline: "", marks: "", assessmentCriteria: "", submissionRequirements: "" });
  return (
    <div className="space-y-4">
      {props.canManage && (
        <div className="card-surface p-5">
          <button type="button" className="btn-primary !py-2.5 !px-5 text-sm" onClick={() => setOpen((value) => !value)}>Create task</button>
          {open && (
            <form
              className="grid gap-3 mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                props.onCreate({
                  title: form.title,
                  description: form.description,
                  instructions: form.instructions,
                  deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
                  marks: form.marks ? Number(form.marks) : null,
                  assessmentCriteria: form.assessmentCriteria,
                  submissionRequirements: form.submissionRequirements,
                });
                setForm({ title: "", description: "", instructions: "", deadline: "", marks: "", assessmentCriteria: "", submissionRequirements: "" });
                setOpen(false);
              }}
            >
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title" className="input-field" />
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" rows={2} className="input-field resize-none" />
              <textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Instructions" rows={2} className="input-field resize-none" />
              <textarea value={form.assessmentCriteria} onChange={(event) => setForm({ ...form, assessmentCriteria: event.target.value })} placeholder="Assessment criteria" rows={2} className="input-field resize-none" />
              <textarea value={form.submissionRequirements} onChange={(event) => setForm({ ...form, submissionRequirements: event.target.value })} placeholder="Submission requirements" rows={2} className="input-field resize-none" />
              <div className="grid sm:grid-cols-2 gap-3">
                <input type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="input-field" />
                <input type="number" min={0} value={form.marks} onChange={(event) => setForm({ ...form, marks: event.target.value })} placeholder="Marks" className="input-field" />
              </div>
              <button className="btn-primary !py-2.5 !px-5 text-sm" type="submit">Save task</button>
            </form>
          )}
        </div>
      )}
      {props.tasks.length === 0 && <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No tasks created yet.</p>}
      {props.tasks.map((task) => (
        <TaskCard key={task.id} task={task} {...props} />
      ))}
    </div>
  );
}

function TaskCard(props: {
  task: CourseTask;
  submissions: { id: string; taskId: string; studentId: string; content: string; status: TaskSubmissionStatus; feedback: string; score: number | null; attachments: { name: string; path: string }[] }[];
  directory: { id: string; fullName: string }[];
  canManage: boolean;
  canReview: boolean;
  studentId?: string;
  onDelete: (id: string) => void;
  onSubmit: (taskId: string, content: string, files: File[]) => void;
  onReview: (id: string, patch: { status: TaskSubmissionStatus; feedback: string; score: number | null }) => void;
  onOpen: (path: string) => Promise<{ url?: string; error?: string }>;
}) {
  const mine = props.submissions.find((item) => item.taskId === props.task.id && item.studentId === props.studentId);
  const visible = props.studentId ? props.submissions.filter((item) => item.taskId === props.task.id && item.studentId === props.studentId) : props.submissions.filter((item) => item.taskId === props.task.id);
  const [content, setContent] = useState(mine?.content ?? "");
  const [files, setFiles] = useState<File[]>([]);
  return (
    <article className="card-surface p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark">{props.task.title}</h3>
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1 whitespace-pre-line">{props.task.description}</p>
          {props.task.instructions && <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-2 whitespace-pre-line">{props.task.instructions}</p>}
          <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-2">
            {props.task.deadline ? `Deadline ${new Date(props.task.deadline).toLocaleString()}` : "No deadline"}
            {props.task.marks != null ? ` · ${props.task.marks} marks` : ""}
          </p>
        </div>
        {props.canManage && <button type="button" className="text-xs font-semibold text-red-500" onClick={() => props.onDelete(props.task.id)}>Delete</button>}
      </div>
      {props.studentId && (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); props.onSubmit(props.task.id, content, files); }}>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} className="input-field resize-none" placeholder="Your submission" />
          <input type="file" className="text-xs" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
          <button className="btn-primary !py-2.5 !px-5 text-sm" type="submit">{mine ? "Update submission" : "Submit task"}</button>
        </form>
      )}
      {visible.map((submission) => (
        <SubmissionBlock
          key={submission.id}
          title={props.directory.find((person) => person.id === submission.studentId)?.fullName ?? "Student"}
          content={submission.content}
          status={submission.status}
          feedback={submission.feedback}
          score={submission.score}
          attachments={submission.attachments}
          canReview={props.canReview && !props.studentId}
          onOpen={props.onOpen}
          onReview={(patch) => props.onReview(submission.id, patch)}
        />
      ))}
    </article>
  );
}

function Projects(props: {
  projects: CourseProject[];
  submissions: { id: string; projectId: string; studentId: string; content: string; status: ProjectStatus; supervisorFeedback: string; adminAssessment: string; attachments: { name: string; path: string }[] }[];
  enrolments: { studentId: string }[];
  directory: { id: string; fullName: string }[];
  canManage: boolean;
  canReview: boolean;
  studentId?: string;
  onCreate: (input: Omit<CourseProject, "id" | "courseId" | "createdAt" | "createdBy" | "attachments">) => void;
  onDelete: (id: string) => void;
  onSubmit: (projectId: string, content: string, files: File[], status: "in_progress" | "submitted") => void;
  onReview: (id: string, patch: { status: ProjectStatus; supervisorFeedback: string; adminAssessment: string }) => void;
  onOpen: (path: string) => Promise<{ url?: string; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", objectives: "", requirements: "", deadline: "" });
  return (
    <div className="space-y-4">
      {props.canManage && (
        <div className="card-surface p-5">
          <button type="button" className="btn-primary !py-2.5 !px-5 text-sm" onClick={() => setOpen((value) => !value)}>Create project</button>
          {open && (
            <form className="grid gap-3 mt-4" onSubmit={(event) => {
              event.preventDefault();
              props.onCreate({
                title: form.title,
                description: form.description,
                objectives: form.objectives,
                requirements: form.requirements,
                deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
              });
              setOpen(false);
            }}>
              <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title" className="input-field" />
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" rows={2} className="input-field resize-none" />
              <textarea value={form.objectives} onChange={(event) => setForm({ ...form, objectives: event.target.value })} placeholder="Objectives" rows={2} className="input-field resize-none" />
              <textarea value={form.requirements} onChange={(event) => setForm({ ...form, requirements: event.target.value })} placeholder="Requirements" rows={2} className="input-field resize-none" />
              <input type="datetime-local" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="input-field" />
              <button className="btn-primary !py-2.5 !px-5 text-sm" type="submit">Save project</button>
            </form>
          )}
        </div>
      )}
      {props.projects.map((project) => {
        const visible = props.studentId
          ? props.submissions.filter((item) => item.projectId === project.id && item.studentId === props.studentId)
          : props.submissions.filter((item) => item.projectId === project.id);
        return (
          <article key={project.id} className="card-surface p-5 space-y-3">
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-heading font-semibold">{project.title}</h3>
                <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1 whitespace-pre-line">{project.description}</p>
                {project.objectives && <p className="text-sm mt-2 whitespace-pre-line">{project.objectives}</p>}
                {project.requirements && <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-2 whitespace-pre-line">{project.requirements}</p>}
              </div>
              {props.canManage && <button type="button" className="text-xs font-semibold text-red-500" onClick={() => props.onDelete(project.id)}>Delete</button>}
            </div>
            {props.studentId && <ProjectSubmit projectId={project.id} existing={visible[0]?.content ?? ""} onSubmit={props.onSubmit} />}
            {visible.map((submission) => (
              <ProjectReview key={submission.id} submission={submission} name={props.directory.find((person) => person.id === submission.studentId)?.fullName ?? "Student"} canReview={props.canReview && !props.studentId} onReview={props.onReview} onOpen={props.onOpen} />
            ))}
          </article>
        );
      })}
      {props.projects.length === 0 && <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No practical projects created yet.</p>}
    </div>
  );
}

function ProjectSubmit({ projectId, existing, onSubmit }: { projectId: string; existing: string; onSubmit: (projectId: string, content: string, files: File[], status: "in_progress" | "submitted") => void }) {
  const [content, setContent] = useState(existing);
  const [files, setFiles] = useState<File[]>([]);
  return (
    <form className="space-y-3" onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const status = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-status") === "in_progress" ? "in_progress" : "submitted";
      onSubmit(projectId, content, files, status);
    }}>
      <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} className="input-field resize-none" placeholder="Project submission" />
      <input type="file" className="text-xs" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
      <div className="flex gap-2">
        <button type="submit" data-status="in_progress" className="btn-secondary !py-2 !px-4 text-xs">Save progress</button>
        <button type="submit" data-status="submitted" className="btn-primary !py-2 !px-4 text-xs">Submit project</button>
      </div>
    </form>
  );
}

function ProjectReview(props: {
  submission: { id: string; content: string; status: ProjectStatus; supervisorFeedback: string; adminAssessment: string; attachments: { name: string; path: string }[] };
  name: string;
  canReview: boolean;
  onReview: (id: string, patch: { status: ProjectStatus; supervisorFeedback: string; adminAssessment: string }) => void;
  onOpen: (path: string) => Promise<{ url?: string; error?: string }>;
}) {
  const [status, setStatus] = useState<ProjectStatus>(props.submission.status);
  const [supervisorFeedback, setSupervisorFeedback] = useState(props.submission.supervisorFeedback);
  const [adminAssessment, setAdminAssessment] = useState(props.submission.adminAssessment);
  return (
    <div className="rounded-xl border border-border-light dark:border-border-dark p-4 space-y-2">
      <p className="text-sm font-semibold">{props.name} · {statusLabel(props.submission.status)}</p>
      <p className="text-sm whitespace-pre-line">{props.submission.content}</p>
      <FileLinks files={props.submission.attachments} onOpen={props.onOpen} />
      {props.canReview && (
        <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); props.onReview(props.submission.id, { status, supervisorFeedback, adminAssessment }); }}>
          <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="select-field">
            {["not_started", "in_progress", "submitted", "under_review", "revision_required", "approved"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <textarea value={supervisorFeedback} onChange={(event) => setSupervisorFeedback(event.target.value)} rows={2} className="input-field resize-none" placeholder="Supervisor feedback" />
          <textarea value={adminAssessment} onChange={(event) => setAdminAssessment(event.target.value)} rows={2} className="input-field resize-none" placeholder="Admin assessment" />
          <button className="btn-primary !py-2 !px-4 text-xs" type="submit">Save review</button>
        </form>
      )}
      {!props.canReview && (props.submission.supervisorFeedback || props.submission.adminAssessment) && (
        <p className="text-xs text-paragraph-light dark:text-paragraph-dark">{props.submission.supervisorFeedback || props.submission.adminAssessment}</p>
      )}
    </div>
  );
}

function SubmissionBlock(props: {
  title: string;
  content: string;
  status: string;
  feedback: string;
  score: number | null;
  attachments: { name: string; path: string }[];
  canReview: boolean;
  onOpen: (path: string) => Promise<{ url?: string; error?: string }>;
  onReview: (patch: { status: TaskSubmissionStatus; feedback: string; score: number | null }) => void;
}) {
  const [status, setStatus] = useState<TaskSubmissionStatus>((props.status as TaskSubmissionStatus) || "submitted");
  const [feedback, setFeedback] = useState(props.feedback);
  const [score, setScore] = useState(props.score?.toString() ?? "");
  return (
    <div className="rounded-xl border border-border-light dark:border-border-dark p-4 space-y-2">
      <p className="text-sm font-semibold">{props.title} · {statusLabel(props.status)}{props.score != null ? ` · ${props.score}` : ""}</p>
      <p className="text-sm whitespace-pre-line">{props.content}</p>
      <FileLinks files={props.attachments} onOpen={props.onOpen} />
      {props.feedback && !props.canReview && <p className="text-xs text-paragraph-light dark:text-paragraph-dark">{props.feedback}</p>}
      {props.canReview && (
        <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); props.onReview({ status, feedback, score: score === "" ? null : Number(score) }); }}>
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskSubmissionStatus)} className="select-field">
            {["submitted", "under_review", "reviewed", "revision_required"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={2} className="input-field resize-none" placeholder="Feedback" />
          <input value={score} onChange={(event) => setScore(event.target.value)} type="number" min={0} className="input-field" placeholder="Score" />
          <button className="btn-primary !py-2 !px-4 text-xs" type="submit">Save review</button>
        </form>
      )}
    </div>
  );
}

function FileLinks({ files, onOpen }: { files: { name: string; path: string }[]; onOpen: (path: string) => Promise<{ url?: string; error?: string }> }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <button
          key={file.path}
          type="button"
          className="text-xs font-semibold text-orange"
          onClick={async () => {
            const result = await onOpen(file.path);
            if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
          }}
        >
          {file.name}
        </button>
      ))}
    </div>
  );
}

function Students(props: {
  enrolments: { studentId: string; completedLessonIds: string[] }[];
  directory: { id: string; fullName: string }[];
  tasks: { id: string }[];
  projects: { id: string }[];
  submissions: { taskId: string; studentId: string; status: string }[];
  projectSubmissions: { projectId: string; studentId: string; status: string }[];
  requiredProjects: number;
}) {
  if (props.enrolments.length === 0) return <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No students enrolled in this course yet.</p>;
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-paragraph-light dark:text-paragraph-dark">
            <th className="p-4">Student</th>
            <th className="p-4">Lessons done</th>
            <th className="p-4">Tasks</th>
            <th className="p-4">Approved projects</th>
            <th className="p-4">Training progress</th>
          </tr>
        </thead>
        <tbody>
          {props.enrolments.map((row) => {
            const tasksCompleted = props.submissions.filter((item) => item.studentId === row.studentId && props.tasks.some((task) => task.id === item.taskId) && ["submitted", "under_review", "reviewed"].includes(item.status)).length;
            const approved = props.projectSubmissions.filter((item) => item.studentId === row.studentId && item.status === "approved" && props.projects.some((project) => project.id === item.projectId)).length;
            const progress = trainingProgress({ taskTotal: props.tasks.length, tasksCompleted, requiredProjects: props.requiredProjects, approvedProjects: approved });
            return (
              <tr key={row.studentId} className="border-t border-border-light dark:border-border-dark">
                <td className="p-4">{props.directory.find((person) => person.id === row.studentId)?.fullName ?? "Student"}</td>
                <td className="p-4">{row.completedLessonIds.length}</td>
                <td className="p-4">{tasksCompleted}/{props.tasks.length}</td>
                <td className="p-4">{approved}/{props.requiredProjects}</td>
                <td className="p-4">{progress}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Supervisor(props: {
  staff: { id: string; userId: string; assignmentRole: "course_admin" | "supervisor" }[];
  directory: { id: string; fullName: string }[];
  users: { id: string; fullName: string; role: string }[];
  canAssign: boolean;
  onAssign: (userId: string, role: "course_admin" | "supervisor") => void;
  onRemove: (id: string) => void;
}) {
  const [userId, setUserId] = useState(props.users[0]?.id ?? "");
  const [role, setRole] = useState<"course_admin" | "supervisor">("course_admin");
  const name = (id: string) => props.directory.find((person) => person.id === id)?.fullName ?? props.users.find((person) => person.id === id)?.fullName ?? "Staff";
  return (
    <div className="card-surface p-6 space-y-4">
      {props.staff.length === 0 && <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No course admin or supervisor assigned yet.</p>}
      {props.staff.map((item) => (
        <div key={item.id} className="flex items-center justify-between text-sm">
          <p><span className="font-medium">{name(item.userId)}</span> <span className="text-xs text-paragraph-light dark:text-paragraph-dark">· {statusLabel(item.assignmentRole)}</span></p>
          {props.canAssign && <button type="button" className="text-xs font-semibold text-red-500" onClick={() => props.onRemove(item.id)}>Remove</button>}
        </div>
      ))}
      {props.canAssign && (
        <form className="grid sm:grid-cols-[1fr_180px_auto] gap-3" onSubmit={(event) => { event.preventDefault(); if (userId) props.onAssign(userId, role); }}>
          <select value={userId} onChange={(event) => setUserId(event.target.value)} className="select-field">
            {props.users.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
          </select>
          <select value={role} onChange={(event) => setRole(event.target.value as "course_admin" | "supervisor")} className="select-field">
            <option value="course_admin">Course Admin</option>
            <option value="supervisor">Supervisor</option>
          </select>
          <button className="btn-primary !py-2.5 !px-5 text-sm" type="submit">Assign</button>
        </form>
      )}
    </div>
  );
}

function WhatsApp(props: {
  url: string;
  supervisors: { userId: string }[];
  directory: { id: string; fullName: string }[];
  canManage: boolean;
  onSave: (url: string) => void;
}) {
  const [url, setUrl] = useState(props.url);
  useEffect(() => setUrl(props.url), [props.url]);
  return (
    <div className="card-surface p-6 space-y-4">
      <div>
        <h3 className="font-heading font-semibold">Assigned supervisor</h3>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
          {props.supervisors.length === 0 ? "No supervisor assigned yet." : props.supervisors.map((item) => props.directory.find((person) => person.id === item.userId)?.fullName ?? "Supervisor").join(", ")}
        </p>
      </div>
      {props.canManage ? (
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); props.onSave(url); }}>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://chat.whatsapp.com/..." className="input-field" />
          <button className="btn-primary !py-2.5 !px-5 text-sm" type="submit">Save invitation link</button>
        </form>
      ) : props.url ? (
        <a href={props.url} target="_blank" rel="noopener noreferrer" className="btn-primary">Join WhatsApp Group</a>
      ) : (
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark">The course admin has not added a WhatsApp invitation yet.</p>
      )}
      <p className="text-xs text-paragraph-light dark:text-paragraph-dark">This opens the WhatsApp invitation. The portal does not add anyone to the group.</p>
    </div>
  );
}

function Progress(props: {
  enrolments: { studentId: string }[];
  directory: { id: string; fullName: string }[];
  tasks: CourseTask[];
  projects: CourseProject[];
  taskSubmissions: { taskId: string; studentId: string; status: string }[];
  projectSubmissions: { projectId: string; studentId: string; status: string; submittedAt?: string | null }[];
  activity: { id: string; supervisorId: string; studentId: string | null; summary: string; createdAt: string; activityType: string }[];
  requiredProjects: number;
  studentId?: string;
}) {
  const rows = props.studentId ? props.enrolments.filter((item) => item.studentId === props.studentId) : props.enrolments;
  const now = Date.now();
  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const tasksCompleted = props.taskSubmissions.filter((item) => item.studentId === row.studentId && ["submitted", "under_review", "reviewed"].includes(item.status)).length;
        const approved = props.projectSubmissions.filter((item) => item.studentId === row.studentId && item.status === "approved").length;
        const started = props.taskSubmissions.some((item) => item.studentId === row.studentId) || props.projectSubmissions.some((item) => item.studentId === row.studentId && item.status !== "not_started");
        const overdue = props.tasks.filter((task) => task.deadline && new Date(task.deadline).getTime() < now && !props.taskSubmissions.some((item) => item.taskId === task.id && item.studentId === row.studentId && ["submitted", "under_review", "reviewed"].includes(item.status))).length
          + props.projects.filter((project) => project.deadline && new Date(project.deadline).getTime() < now && !props.projectSubmissions.some((item) => item.projectId === project.id && item.studentId === row.studentId && ["submitted", "under_review", "approved"].includes(item.status))).length;
        const progress = trainingProgress({ taskTotal: props.tasks.length, tasksCompleted, requiredProjects: props.requiredProjects, approvedProjects: approved });
        return (
          <div key={row.studentId} className="card-surface p-5">
            <p className="font-semibold">{props.directory.find((person) => person.id === row.studentId)?.fullName ?? "Student"}</p>
            <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
              {progress}% from completed tasks and approved projects. {started ? "Started." : "Not started."} {overdue > 0 ? `${overdue} overdue item${overdue === 1 ? "" : "s"}.` : "No overdue items."}
            </p>
          </div>
        );
      })}
      {rows.length === 0 && <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No enrolment records to calculate.</p>}
      <div className="card-surface p-5">
        <h3 className="font-heading font-semibold mb-3">Activity record</h3>
        {props.activity.length === 0 && <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No activity yet.</p>}
        <ul className="space-y-2">
          {props.activity.slice(0, 12).map((item) => (
            <li key={item.id} className="text-sm text-paragraph-light dark:text-paragraph-dark">{new Date(item.createdAt).toLocaleString()} — {item.summary}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Examination(props: {
  courseId: string;
  rules: { requireTasks: boolean; requireProjects: boolean; requireSupervisorReady: boolean };
  requiredProjects: number;
  tasks: { id: string }[];
  projects: { id: string }[];
  taskSubmissions: { taskId: string; studentId: string; status: string }[];
  projectSubmissions: { projectId: string; studentId: string; status: string }[];
  activity: { courseId: string; studentId: string | null; activityType: string; createdAt: string }[];
  applications: { id: string; studentId: string; status: "applied" | "under_review" | "approved" | "rejected" | "scheduled" | "completed" | "passed" | "failed"; decisionNote: string; scheduledAt: string | null; scheduleNote: string; score: number | null; resultNote: string }[];
  examination?: { title: string; scheduledAt: string | null; instructions: string };
  enrolments: { studentId: string }[];
  directory: { id: string; fullName: string }[];
  studentId?: string;
  canReview: boolean;
  canManage: boolean;
  canSupervise: boolean;
  onApply: () => void;
  onReady: (studentId: string, ready: boolean) => void;
  onUpdate: (id: string, patch: { status?: "applied" | "under_review" | "approved" | "rejected" | "scheduled"; decisionNote?: string; scheduledAt?: string | null; scheduleNote?: string }) => void;
  onSchedule: (input: { title: string; scheduledAt: string | null; instructions: string }) => void;
  onResult: (application: { id: string; courseId: string; studentId: string; status: "applied" | "under_review" | "approved" | "rejected" | "scheduled" | "completed" | "passed" | "failed"; decisionNote: string; reviewedBy: null; reviewedAt: null; scheduledAt: string | null; scheduleNote: string; score: number | null; resultNote: string; appliedAt: string }, outcome: "passed" | "failed", score: number | null, note: string) => void;
  onDelete: (id: string) => void;
  onRules: (rules: { requireTasks: boolean; requireProjects: boolean; requireSupervisorReady: boolean }) => void;
}) {
  const [rules, setRules] = useState(props.rules);
  const [schedule, setSchedule] = useState({
    title: props.examination?.title ?? "Final examination",
    scheduledAt: props.examination?.scheduledAt ? props.examination.scheduledAt.slice(0, 16) : "",
    instructions: props.examination?.instructions ?? "",
  });
  const people = props.studentId ? props.enrolments.filter((item) => item.studentId === props.studentId) : props.enrolments;
  const eligibilityFor = useMemo(() => (studentId: string) => {
    const completed = props.taskSubmissions.filter((item) => item.studentId === studentId && ["submitted", "under_review", "reviewed"].includes(item.status)).length;
    const approved = props.projectSubmissions.filter((item) => item.studentId === studentId && item.status === "approved").length;
    return evaluateExamEligibility({
      enrolled: true,
      requiredProjectCount: props.requiredProjects,
      approvedProjects: approved,
      taskCount: props.tasks.length,
      completedTaskCount: completed,
      supervisorReady: isSupervisorReady(props.activity as never, props.courseId, studentId),
      rules: props.rules,
    });
  }, [props]);

  return (
    <div className="space-y-4">
      {props.canManage && (
        <form className="card-surface p-5 space-y-3" onSubmit={(event) => { event.preventDefault(); props.onRules(rules); }}>
          <h3 className="font-heading font-semibold">Eligibility rules</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.requireTasks} onChange={(event) => setRules({ ...rules, requireTasks: event.target.checked })} className="accent-orange" /> Require every task to be submitted</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.requireProjects} onChange={(event) => setRules({ ...rules, requireProjects: event.target.checked })} className="accent-orange" /> Require the configured number of approved projects</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.requireSupervisorReady} onChange={(event) => setRules({ ...rules, requireSupervisorReady: event.target.checked })} className="accent-orange" /> Require supervisor readiness</label>
          <button className="btn-primary !py-2 !px-4 text-xs" type="submit">Save rules</button>
        </form>
      )}
      {props.canManage && (
        <form className="card-surface p-5 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          props.onSchedule({ title: schedule.title, scheduledAt: schedule.scheduledAt ? new Date(schedule.scheduledAt).toISOString() : null, instructions: schedule.instructions });
        }}>
          <h3 className="font-heading font-semibold">Examination schedule</h3>
          <input value={schedule.title} onChange={(event) => setSchedule({ ...schedule, title: event.target.value })} className="input-field" />
          <input type="datetime-local" value={schedule.scheduledAt} onChange={(event) => setSchedule({ ...schedule, scheduledAt: event.target.value })} className="input-field" />
          <textarea value={schedule.instructions} onChange={(event) => setSchedule({ ...schedule, instructions: event.target.value })} rows={2} className="input-field resize-none" placeholder="Instructions" />
          <button className="btn-primary !py-2 !px-4 text-xs" type="submit">Save schedule</button>
        </form>
      )}
      {props.examination && <div className="card-surface p-5 text-sm"><p className="font-semibold">{props.examination.title}</p><p className="text-paragraph-light dark:text-paragraph-dark mt-1">{props.examination.scheduledAt ? new Date(props.examination.scheduledAt).toLocaleString() : "Not scheduled"}</p>{props.examination.instructions && <p className="mt-2">{props.examination.instructions}</p>}</div>}
      {people.map((person) => {
        const check = eligibilityFor(person.studentId);
        const application = props.applications.find((item) => item.studentId === person.studentId);
        const ready = isSupervisorReady(props.activity as never, props.courseId, person.studentId);
        return (
          <div key={person.studentId} className="card-surface p-5 space-y-3">
            <p className="font-semibold">{props.directory.find((item) => item.id === person.studentId)?.fullName ?? "Student"}</p>
            <p className="text-sm">{check.eligible ? "Eligible" : "Not Eligible"}</p>
            {check.reasons.map((reason) => <p key={reason} className="text-xs text-paragraph-light dark:text-paragraph-dark">{reason}</p>)}
            {application && <p className="text-sm">Status: {statusLabel(application.status)}{application.score != null ? ` · Score ${application.score}` : ""}</p>}
            {application?.resultNote && <p className="text-sm">{application.resultNote}</p>}
            {application?.scheduleNote && <p className="text-xs text-paragraph-light dark:text-paragraph-dark">{application.scheduleNote}</p>}
            {props.studentId && check.eligible && !application && <button type="button" className="btn-primary !py-2.5 !px-5 text-sm" onClick={props.onApply}>Apply for final examination</button>}
            {props.canSupervise && !props.studentId && (
              <button type="button" className="btn-secondary !py-2 !px-4 text-xs" onClick={() => props.onReady(person.studentId, !ready)}>{ready ? "Revoke readiness" : "Confirm examination readiness"}</button>
            )}
            {props.canManage && application && (
              <ExamDecision
                application={application}
                onUpdate={props.onUpdate}
                onResult={(outcome, score, note) => props.onResult({ ...application, courseId: props.courseId, reviewedBy: null, reviewedAt: null, appliedAt: "" }, outcome, score, note)}
                onDelete={() => props.onDelete(application.id)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExamDecision(props: {
  application: { id: string; status: string; decisionNote: string; scheduledAt: string | null; scheduleNote: string };
  onUpdate: (id: string, patch: { status?: "under_review" | "approved" | "rejected" | "scheduled"; decisionNote?: string; scheduledAt?: string | null; scheduleNote?: string }) => void;
  onResult: (outcome: "passed" | "failed", score: number | null, note: string) => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState(props.application.status);
  const [note, setNote] = useState(props.application.decisionNote);
  const [when, setWhen] = useState(props.application.scheduledAt ? props.application.scheduledAt.slice(0, 16) : "");
  const [scheduleNote, setScheduleNote] = useState(props.application.scheduleNote);
  const [score, setScore] = useState("");
  const [resultNote, setResultNote] = useState("");
  return (
    <div className="grid gap-2">
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="select-field">
        {["applied", "under_review", "approved", "rejected", "scheduled"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
      </select>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className="input-field resize-none" placeholder="Decision note" />
      <input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className="input-field" />
      <input value={scheduleNote} onChange={(event) => setScheduleNote(event.target.value)} className="input-field" placeholder="Schedule note" />
      <button type="button" className="btn-primary !py-2 !px-4 text-xs" onClick={() => props.onUpdate(props.application.id, { status: status as "under_review", decisionNote: note, scheduledAt: when ? new Date(when).toISOString() : null, scheduleNote })}>Save decision</button>
      <div className="flex flex-wrap gap-2">
        <input value={score} onChange={(event) => setScore(event.target.value)} type="number" className="input-field max-w-[120px]" placeholder="Score" />
        <input value={resultNote} onChange={(event) => setResultNote(event.target.value)} className="input-field" placeholder="Result note" />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-primary !py-2 !px-4 text-xs" onClick={() => props.onResult("passed", score === "" ? null : Number(score), resultNote)}>Record passed</button>
        <button type="button" className="btn-secondary !py-2 !px-4 text-xs" onClick={() => props.onResult("failed", score === "" ? null : Number(score), resultNote)}>Record failed</button>
        <button type="button" className="text-xs font-semibold text-red-500" onClick={props.onDelete}>Allow reapplication</button>
      </div>
    </div>
  );
}
