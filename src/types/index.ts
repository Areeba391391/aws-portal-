export type Role = "student" | "team" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type LessonType = "reading" | "video" | "lab";

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  /** For "reading": plain text/markdown-ish content shown in-app.
   *  For "video": a video URL (YouTube/Vimeo embed link or direct mp4) played in-app.
   *  For "lab": step-by-step instructions solved in-app (checklist), not a downloadable file. */
  content: string;
  durationMinutes?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  status: "Active" | "Draft";
  lessons: Lesson[];
  quiz: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  modules: number;
  icon: string;
  status: "Active" | "Draft";
  thumbnail?: string;
  category?: string;
  instructor?: string;
  durationHours?: number;
  certificateEnabled: boolean;
  startDate?: string;
  endDate?: string;
  learningObjectives?: string;
  requiredSkills?: string;
  whatsappUrl?: string;
  requiredProjectCount?: number;
  examEligibility?: {
    requireTasks: boolean;
    requireProjects: boolean;
    requireSupervisorReady: boolean;
  };
  lifecycleStatus?: "active" | "completed" | "archived";
  /** Full course content — modules, lessons, and quizzes. Everything a
   * student sees inside a course lives here; there are no external links
   * (e.g. GitHub) required to view course content. Managed entirely from
   * Dashboard → Admin → Courses → Manage Content. */
  syllabus: CourseModule[];
}

export type FormFieldType = "text" | "email" | "tel" | "textarea" | "select" | "number";

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export type EventType = "Workshop" | "Hackathon" | "Bootcamp" | "Seminar";

export const EVENT_TYPES: EventType[] = ["Workshop", "Hackathon", "Bootcamp", "Seminar"];

export interface EventItem {
  id: string;
  title: string;
  type: EventType;
  date: string;
  mode: "Online" | "Onsite" | "Hybrid";
  description: string;
  venue?: string;
  maxParticipants?: number;
  registrationOpen?: boolean;
  registrationForm?: FormField[];
  prizes?: string;
  teamSizeMax?: number;
  rules?: string;
  /** Zoom / Google Meet / Teams URL shared with registered participants. */
  meetingLink?: string;
  /** Hackathons are always team-based; other event types opt in explicitly. */
  teamRegistration?: boolean;
  isCancelled?: boolean;
}

/** Hackathons always register as teams; other types only when the admin opts in. */
export function eventNeedsTeamName(event: Pick<EventItem, "type" | "teamRegistration">) {
  return event.type === "Hackathon" || event.teamRegistration === true;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isActive: boolean;
  courseId?: string;
}

export type ResourceType =
  | "PDF"
  | "DOC"
  | "PPT"
  | "XLS"
  | "Image"
  | "Video"
  | "Audio"
  | "ZIP"
  | "Text"
  | "Markdown"
  | "Link";

export interface ResourceItem {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  size: string;
  /** A URL, or a data: URI when the file was uploaded directly. */
  url: string;
  thumbnail?: string;
  /** If set, this resource belongs to a specific course (and optionally a
   * specific module within it) and is only shown there — inside the
   * course's Learn page — rather than as a general public resource. */
  courseId?: string;
  moduleId?: string;
  visibility: "Enrolled Students" | "Public";
  downloadAllowed: boolean;
  previewAllowed: boolean;
  uploadedBy: string;
  uploadedAt: string;
  downloads: number;
  views: number;
  displayOrder?: number;
  materialCategory?: string;
}

export interface Review {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface SiteSettings {
  heroTitle: string;
  heroDescription: string;
  contactEmail: string;
  contactPhone: string;
  statMembers: string;
  statEvents: string;
  statCertificates: string;
  statProjects: string;
  platformName: string;
  universityName: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
}

export interface Certificate {
  id: string;
  course_title: string;
  issued_at: string;
  student_id: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "resource" | "course" | "certificate" | "event" | "review" | "system" | "task" | "project" | "exam" | "announcement";
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface StatCardData {
  label: string;
  value: string;
  icon: string;
}
