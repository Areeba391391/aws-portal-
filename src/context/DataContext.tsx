"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import {
  Course,
  EventItem,
  ResourceItem,
  SiteSettings,
  CourseModule,
  Lesson,
  QuizQuestion,
  Review,
  Notification,
  Announcement,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import { normalizeEventDateForStorage } from "@/lib/eventDates";
import { courseTrainingFromRow } from "@/lib/vtms";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

export interface LearningPath {
  id: string;
  title: string;
  level: string;
  courses: number;
}

interface DataContextValue {
  courses: Course[];
  events: EventItem[];
  resources: ResourceItem[];
  learningPaths: LearningPath[];
  siteSettings: SiteSettings;
  reviews: Review[];
  notifications: Notification[];
  announcements: Announcement[];
  loading: boolean;

  addCourse: (c: Omit<Course, "id" | "syllabus" | "modules" | "certificateEnabled"> & { certificateEnabled?: boolean }) => Promise<void>;
  updateCourse: (id: string, c: Partial<Omit<Course, "id">>) => Promise<{ error?: string }>;
  deleteCourse: (id: string) => Promise<void>;
  duplicateCourse: (id: string) => Promise<void>;

  addModule: (courseId: string, title: string) => Promise<void>;
  updateModule: (courseId: string, moduleId: string, data: Partial<Omit<CourseModule, "id" | "lessons" | "quiz">>) => Promise<void>;
  deleteModule: (courseId: string, moduleId: string) => Promise<void>;
  reorderModules: (courseId: string, orderedIds: string[]) => Promise<void>;

  moveModule: (courseId: string, moduleId: string, direction: -1 | 1) => Promise<void>;

  addLesson: (courseId: string, moduleId: string, lesson: Omit<Lesson, "id">) => Promise<void>;
  moveLesson: (courseId: string, moduleId: string, lessonId: string, direction: -1 | 1) => Promise<void>;
  updateLesson: (courseId: string, moduleId: string, lessonId: string, lesson: Partial<Omit<Lesson, "id">>) => Promise<void>;
  deleteLesson: (courseId: string, moduleId: string, lessonId: string) => Promise<void>;

  addQuizQuestion: (courseId: string, moduleId: string, q: Omit<QuizQuestion, "id">) => Promise<void>;
  updateQuizQuestion: (courseId: string, moduleId: string, questionId: string, q: Partial<Omit<QuizQuestion, "id">>) => Promise<void>;
  deleteQuizQuestion: (courseId: string, moduleId: string, questionId: string) => Promise<void>;

  addEvent: (e: Omit<EventItem, "id">) => Promise<void>;
  updateEvent: (id: string, e: Partial<Omit<EventItem, "id">>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  addResource: (r: Omit<ResourceItem, "id" | "downloads" | "views" | "uploadedAt">) => Promise<void>;
  updateResource: (id: string, r: Partial<Omit<ResourceItem, "id">>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  trackResourceView: (id: string) => Promise<void>;
  trackResourceDownload: (id: string) => Promise<void>;

  addLearningPath: (p: Omit<LearningPath, "id">) => Promise<void>;
  updateLearningPath: (id: string, p: Partial<Omit<LearningPath, "id">>) => Promise<void>;
  deleteLearningPath: (id: string) => Promise<void>;

  addReview: (r: Omit<Review, "id" | "createdAt">) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  hasReviewed: (courseId: string, userId: string) => boolean;

  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;

  updateSiteSettings: (s: Partial<SiteSettings>) => Promise<void>;

  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt" | "isActive">) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const defaultSiteSettings: SiteSettings = {
  heroTitle: "Learn AWS Cloud. Build. Innovate.",
  heroDescription: "Founded in 2026 at UET Taxila — AWS SBG UET Taxila is a student-led community learning, building, and innovating on AWS Cloud.",
  contactEmail: "hello@awssbg.com",
  contactPhone: "",
  statMembers: "0",
  statEvents: "0",
  statCertificates: "0",
  statProjects: "0",
  platformName: "AWS SBG UET Taxila",
  universityName: "UET Taxila",
  maintenanceMode: false,
  allowRegistrations: false,
};

// ---------- row <-> app-type mapping ----------
function courseFromRow(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    level: row.level,
    modules: row.modules ?? 0,
    icon: row.icon ?? "Cloud",
    status: row.status,
    thumbnail: row.thumbnail ?? undefined,
    category: row.category ?? undefined,
    instructor: row.instructor ?? undefined,
    durationHours: row.duration_hours ?? undefined,
    certificateEnabled: row.certificate_enabled ?? true,
    syllabus: row.syllabus ?? [],
    ...courseTrainingFromRow(row),
  };
}

function eventFromRow(row: any): EventItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    date: row.event_date,
    mode: row.mode,
    description: row.description ?? "",
    venue: row.venue ?? undefined,
    maxParticipants: row.max_participants ?? undefined,
    registrationOpen: row.registration_open ?? true,
    registrationForm: row.registration_form ?? [],
    prizes: row.prizes ?? undefined,
    teamSizeMax: row.team_size_max ?? undefined,
    rules: row.rules ?? undefined,
    meetingLink: row.meeting_link ?? undefined,
    teamRegistration: row.team_registration ?? false,
    isCancelled: row.is_cancelled ?? false,
  };
}

/** Columns added in migrate-v6.sql. Requests degrade gracefully until it is applied. */
const EVENT_V6_COLUMNS = ["meeting_link", "team_registration", "is_cancelled"] as const;

function isMissingV6Column(message?: string) {
  return Boolean(message && EVENT_V6_COLUMNS.some((column) => message.includes(column)));
}

function withoutV6Columns(payload: Record<string, unknown>) {
  const next = { ...payload };
  for (const column of EVENT_V6_COLUMNS) delete next[column];
  return next;
}

function announcementFromRow(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    isActive: row.is_active ?? true,
    courseId: row.course_id ?? undefined,
  };
}

function resourceFromRow(row: any): ResourceItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type,
    size: row.size_label ?? "",
    url: row.file_url ?? "",
    thumbnail: row.thumbnail ?? undefined,
    courseId: row.course_id ?? undefined,
    moduleId: row.module_id ?? undefined,
    visibility: row.visibility,
    downloadAllowed: row.download_allowed,
    previewAllowed: row.preview_allowed,
    uploadedBy: row.uploaded_by ?? "",
    uploadedAt: row.created_at,
    downloads: row.downloads ?? 0,
    views: row.views ?? 0,
    displayOrder: row.display_order ?? 0,
    materialCategory: row.material_category ?? undefined,
  };
}

function reviewFromRow(row: any): Review {
  return {
    id: row.id,
    courseId: row.course_id,
    userId: row.student_id,
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment ?? "",
    createdAt: row.created_at,
  };
}

function notificationFromRow(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.message ?? "",
    type: row.type,
    read: row.is_read,
    createdAt: row.created_at,
    link: row.link ?? undefined,
  };
}

function siteSettingsFromRow(row: any): SiteSettings {
  return {
    heroTitle: row.hero_title,
    heroDescription: row.hero_description,
    contactEmail: row.contact_email ?? "",
    contactPhone: row.contact_phone ?? "",
    statMembers: row.stat_members ?? "0",
    statEvents: row.stat_events ?? "0",
    statCertificates: row.stat_certificates ?? "0",
    statProjects: row.stat_projects ?? "0",
    platformName: row.platform_name ?? "AWS SBG UET Taxila",
    universityName: row.university_name ?? "",
    maintenanceMode: row.maintenance_mode ?? false,
    allowRegistrations: row.allow_registrations ?? true,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const { user } = useAuth();
  const pathname = usePathname();
  const userRef = useRef(user);
  userRef.current = user;

  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [learningPathRows, setLearningPathRows] = useState<LearningPath[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const learningPaths: LearningPath[] = learningPathRows;

  const refreshCourses = useCallback(async () => {
    const { data } = await supabase
      .from("courses")
      .select(
        "id,title,description,level,modules,icon,status,thumbnail,category,instructor,duration_hours,certificate_enabled,syllabus,start_date,end_date,learning_objectives,required_skills,whatsapp_url,required_project_count,exam_eligibility,lifecycle_status,created_at"
      )
      .order("created_at", { ascending: false });
    if (data) setCourses(data.map(courseFromRow));
  }, [supabase]);

  const refreshEvents = useCallback(async () => {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    if (!error && data) {
      setEvents(data.map(eventFromRow));
      return;
    }
    // Older projects may not have v6 columns yet — fall back to core fields.
    const legacy = await supabase
      .from("events")
      .select("id,title,type,description,event_date,mode,venue,max_participants,registration_open,registration_form,prizes,team_size_max,rules,created_at")
      .order("event_date", { ascending: true });
    if (legacy.data) setEvents(legacy.data.map(eventFromRow));
  }, [supabase]);

  const refreshResources = useCallback(async () => {
    const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
    if (data) setResources(data.map(resourceFromRow));
  }, [supabase]);

  const refreshLearningPaths = useCallback(async () => {
    const { data } = await supabase.from("learning_paths").select("*").order("created_at", { ascending: true });
    if (data) setLearningPathRows(data as any);
  }, [supabase]);

  const refreshReviews = useCallback(async () => {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (data) setReviews(data.map(reviewFromRow));
  }, [supabase]);

  const refreshSiteSettings = useCallback(async () => {
    const { data } = await supabase.from("site_settings").select("*").eq("id", true).maybeSingle();
    if (data) setSiteSettings(siteSettingsFromRow(data));
  }, [supabase]);

  const refreshNotifications = useCallback(async () => {
    if (!userRef.current) {
      setNotifications([]);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("id,user_id,title,message,type,is_read,created_at,link")
      .eq("user_id", userRef.current.id)
      .order("created_at", { ascending: false })
      .limit(40);
    if (data) setNotifications(data.map(notificationFromRow));
  }, [supabase]);

  const refreshAnnouncements = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id,title,message,created_at,is_active,course_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setAnnouncements(data.map(announcementFromRow));
  }, [supabase]);

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshCourses(),
      refreshEvents(),
      refreshResources(),
      refreshLearningPaths(),
      refreshReviews(),
      refreshSiteSettings(),
      refreshNotifications(),
      refreshAnnouncements(),
    ]);
  }, [refreshCourses, refreshEvents, refreshResources, refreshLearningPaths, refreshReviews, refreshSiteSettings, refreshNotifications, refreshAnnouncements]);

  const loadersRef = useRef({
    refresh,
    refreshCourses,
    refreshEvents,
    refreshSiteSettings,
    refreshAnnouncements,
  });
  loadersRef.current = { refresh, refreshCourses, refreshEvents, refreshSiteSettings, refreshAnnouncements };

  const loadedBucketsRef = useRef<Set<string>>(new Set());
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextId = user?.id ?? null;
    if (lastUserIdRef.current !== nextId) {
      lastUserIdRef.current = nextId;
      loadedBucketsRef.current.delete("dashboard");
    }
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    const loaders = loadersRef.current;

    async function loadForRoute() {
      const jobs: Promise<void>[] = [];
      const mark = (bucket: string, job: Promise<void>) => {
        if (loadedBucketsRef.current.has(bucket)) return;
        jobs.push(
          job.then(() => {
            if (active) loadedBucketsRef.current.add(bucket);
          })
        );
      };

      if (pathname.startsWith("/dashboard")) {
        // Full dashboard payload once per session area — not on every sub-route click.
        if (!loadedBucketsRef.current.has("dashboard")) {
          setLoading(true);
          await loaders.refresh();
          if (active) {
            loadedBucketsRef.current.add("dashboard");
            setLoading(false);
          }
        }
        return;
      }

      setLoading(true);
      if (pathname === "/" || pathname.startsWith("/courses")) mark("courses", loaders.refreshCourses());
      if (pathname === "/" || pathname.startsWith("/events") || pathname.startsWith("/hackathons")) mark("events", loaders.refreshEvents());
      if (pathname === "/" || pathname.startsWith("/contact") || pathname.startsWith("/about")) mark("settings", loaders.refreshSiteSettings());
      if (pathname === "/" || pathname.startsWith("/dashboard")) mark("announcements", loaders.refreshAnnouncements());
      await Promise.all(jobs);
      if (active) setLoading(false);
    }

    loadForRoute();
    return () => {
      active = false;
    };
  }, [pathname]);

  // Re-load notifications whenever who's logged in changes, and keep them
  // live via Supabase Realtime — this is what makes the reminder job (which
  // inserts rows from inside Postgres on a schedule) show up in the bell
  // icon without the user needing to refresh the page.
  useEffect(() => {
    refreshNotifications();
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refreshNotifications()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshNotifications, supabase]);

  // ---- helper: mutate a course's nested syllabus JSONB and persist ----
  async function persistCourse(courseId: string, mutate: (c: Course) => Course) {
    const current = courses.find((c) => c.id === courseId);
    if (!current) return;
    const next = mutate(current);
    const { error } = await supabase
      .from("courses")
      .update({ syllabus: next.syllabus, modules: next.syllabus.length })
      .eq("id", courseId);
    if (error) {
      console.error("Failed to save course:", error.message);
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...next, modules: next.syllabus.length } : c)));
  }

  function withCourseModule(course: Course, moduleId: string, mutate: (m: CourseModule) => CourseModule): Course {
    return { ...course, syllabus: course.syllabus.map((m) => (m.id === moduleId ? mutate(m) : m)) };
  }

  const value: DataContextValue = {
    courses,
    events,
    resources,
    learningPaths,
    siteSettings,
    reviews,
    notifications,
    announcements,
    loading,
    refresh,

    addCourse: async (c) => {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: c.title,
          description: c.description,
          level: c.level,
          icon: c.icon,
          status: c.status,
          thumbnail: c.thumbnail,
          category: c.category,
          instructor: c.instructor,
          duration_hours: c.durationHours,
          certificate_enabled: c.certificateEnabled ?? true,
          modules: 0,
          syllabus: [],
        })
        .select()
        .single();
      if (error) {
        console.error("Failed to add course:", error.message);
        alert(`Couldn't add course: ${error.message}`);
        return;
      }
      if (data) setCourses((prev) => [courseFromRow(data), ...prev]);
    },
    updateCourse: async (id, c) => {
      const patch: Record<string, unknown> = {};
      if (c.title !== undefined) patch.title = c.title;
      if (c.description !== undefined) patch.description = c.description;
      if (c.level !== undefined) patch.level = c.level;
      if (c.icon !== undefined) patch.icon = c.icon;
      if (c.status !== undefined) patch.status = c.status;
      if (c.thumbnail !== undefined) patch.thumbnail = c.thumbnail;
      if (c.category !== undefined) patch.category = c.category;
      if (c.instructor !== undefined) patch.instructor = c.instructor;
      if (c.durationHours !== undefined) patch.duration_hours = c.durationHours;
      if (c.certificateEnabled !== undefined) patch.certificate_enabled = c.certificateEnabled;
      if (c.startDate !== undefined) patch.start_date = c.startDate || null;
      if (c.endDate !== undefined) patch.end_date = c.endDate || null;
      if (c.learningObjectives !== undefined) patch.learning_objectives = c.learningObjectives;
      if (c.requiredSkills !== undefined) patch.required_skills = c.requiredSkills;
      if (c.whatsappUrl !== undefined) patch.whatsapp_url = c.whatsappUrl || null;
      if (c.requiredProjectCount !== undefined) patch.required_project_count = c.requiredProjectCount;
      if (c.examEligibility !== undefined) patch.exam_eligibility = c.examEligibility;
      if (c.lifecycleStatus !== undefined) patch.lifecycle_status = c.lifecycleStatus;
      const { error } = await supabase.from("courses").update(patch).eq("id", id);
      if (error) {
        alert(`Couldn't save course: ${error.message}`);
        return { error: error.message };
      }
      setCourses((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, ...c, whatsappUrl: c.whatsappUrl ? c.whatsappUrl : c.whatsappUrl === "" ? undefined : x.whatsappUrl }
            : x
        )
      );
      return {};
    },
    deleteCourse: async (id) => {
      await supabase.from("courses").delete().eq("id", id);
      setCourses((prev) => prev.filter((x) => x.id !== id));
      setResources((prev) => prev.filter((r) => r.courseId !== id));
      setReviews((prev) => prev.filter((r) => r.courseId !== id));
    },
    duplicateCourse: async (id) => {
      const original = courses.find((c) => c.id === id);
      if (!original) return;
      const payload = {
        title: `${original.title} (Copy)`,
        description: original.description,
        level: original.level,
        icon: original.icon,
        status: "Draft" as const,
        thumbnail: original.thumbnail,
        category: original.category,
        instructor: original.instructor,
        duration_hours: original.durationHours,
        certificate_enabled: original.certificateEnabled,
        start_date: original.startDate ?? null,
        end_date: original.endDate ?? null,
        learning_objectives: original.learningObjectives ?? null,
        required_skills: original.requiredSkills ?? null,
        whatsapp_url: original.whatsappUrl ?? null,
        required_project_count: original.requiredProjectCount ?? 2,
        exam_eligibility: original.examEligibility ?? {},
        lifecycle_status: original.lifecycleStatus ?? "active",
        modules: original.syllabus.length,
        syllabus: original.syllabus,
      };
      let { data, error } = await supabase.from("courses").insert(payload).select().single();
      if (error && /start_date|whatsapp_url|lifecycle_status|required_project_count|exam_eligibility|learning_objectives|required_skills/.test(error.message)) {
        const {
          start_date: _start,
          end_date: _end,
          learning_objectives: _objectives,
          required_skills: _skills,
          whatsapp_url: _whatsapp,
          required_project_count: _count,
          exam_eligibility: _rules,
          lifecycle_status: _lifecycle,
          ...legacy
        } = payload;
        ({ data, error } = await supabase.from("courses").insert(legacy).select().single());
      }
      if (!data) return;
      const newCourse = courseFromRow(data);
      setCourses((prev) => [newCourse, ...prev]);

      const toCopy = resources.filter((r) => r.courseId === id);
      if (toCopy.length > 0) {
        const { data: copied } = await supabase
          .from("resources")
          .insert(
            toCopy.map((r) => ({
              title: r.title,
              description: r.description,
              type: r.type,
              file_url: r.url,
              size_label: r.size,
              thumbnail: r.thumbnail,
              course_id: newCourse.id,
              module_id: r.moduleId,
              visibility: r.visibility,
              download_allowed: r.downloadAllowed,
              preview_allowed: r.previewAllowed,
              uploaded_by: r.uploadedBy,
            }))
          )
          .select();
        if (copied) setResources((prev) => [...copied.map(resourceFromRow), ...prev]);
      }
    },

    addModule: (courseId, title) =>
      persistCourse(courseId, (c) => ({
        ...c,
        syllabus: [
          ...c.syllabus,
          { id: `m_${Date.now()}`, title, order: c.syllabus.length + 1, status: "Active", lessons: [], quiz: [] },
        ],
      })),
    updateModule: (courseId, moduleId, data) =>
      persistCourse(courseId, (c) => withCourseModule(c, moduleId, (m) => ({ ...m, ...data }))),
    deleteModule: (courseId, moduleId) =>
      persistCourse(courseId, (c) => ({ ...c, syllabus: c.syllabus.filter((m) => m.id !== moduleId) })),
    reorderModules: (courseId, orderedIds) =>
      persistCourse(courseId, (c) => ({
        ...c,
        syllabus: orderedIds
          .map((id, i) => {
            const m = c.syllabus.find((mm) => mm.id === id);
            return m ? { ...m, order: i + 1 } : null;
          })
          .filter((m): m is CourseModule => Boolean(m)),
      })),

    moveModule: (courseId, moduleId, direction) =>
      persistCourse(courseId, (c) => {
        const ordered = [...c.syllabus].sort((a, b) => a.order - b.order);
        const from = ordered.findIndex((m) => m.id === moduleId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= ordered.length) return c;
        [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
        return { ...c, syllabus: ordered.map((m, i) => ({ ...m, order: i + 1 })) };
      }),

    addLesson: (courseId, moduleId, lesson) =>
      persistCourse(courseId, (c) =>
        withCourseModule(c, moduleId, (m) => ({ ...m, lessons: [...m.lessons, { ...lesson, id: `l_${Date.now()}` }] }))
      ),
    moveLesson: (courseId, moduleId, lessonId, direction) =>
      persistCourse(courseId, (c) =>
        withCourseModule(c, moduleId, (m) => {
          const lessons = [...m.lessons];
          const from = lessons.findIndex((l) => l.id === lessonId);
          const to = from + direction;
          if (from < 0 || to < 0 || to >= lessons.length) return m;
          [lessons[from], lessons[to]] = [lessons[to], lessons[from]];
          return { ...m, lessons };
        })
      ),
    updateLesson: (courseId, moduleId, lessonId, lesson) =>
      persistCourse(courseId, (c) =>
        withCourseModule(c, moduleId, (m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, ...lesson } : l)),
        }))
      ),
    deleteLesson: (courseId, moduleId, lessonId) =>
      persistCourse(courseId, (c) =>
        withCourseModule(c, moduleId, (m) => ({ ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }))
      ),

    addQuizQuestion: (courseId, moduleId, q) =>
      persistCourse(courseId, (c) =>
        withCourseModule(c, moduleId, (m) => ({ ...m, quiz: [...m.quiz, { ...q, id: `q_${Date.now()}` }] }))
      ),
    updateQuizQuestion: (courseId, moduleId, questionId, q) =>
      persistCourse(courseId, (c) =>
        withCourseModule(c, moduleId, (m) => ({
          ...m,
          quiz: m.quiz.map((x) => (x.id === questionId ? { ...x, ...q } : x)),
        }))
      ),
    deleteQuizQuestion: (courseId, moduleId, questionId) =>
      persistCourse(courseId, (c) =>
        withCourseModule(c, moduleId, (m) => ({ ...m, quiz: m.quiz.filter((x) => x.id !== questionId) }))
      ),

    addEvent: async (e) => {
      const payload: Record<string, unknown> = {
        title: e.title,
        type: e.type,
        event_date: normalizeEventDateForStorage(e.date),
        mode: e.mode,
        description: e.description,
        venue: e.venue,
        max_participants: e.maxParticipants,
        registration_open: e.registrationOpen ?? true,
        registration_form: e.registrationForm ?? [],
        prizes: e.prizes,
        team_size_max: e.teamSizeMax,
        rules: e.rules,
        meeting_link: e.meetingLink || null,
        team_registration: e.teamRegistration ?? false,
        is_cancelled: e.isCancelled ?? false,
      };

      let { data, error } = await supabase.from("events").insert(payload).select().single();
      if (isMissingV6Column(error?.message)) {
        ({ data, error } = await supabase.from("events").insert(withoutV6Columns(payload)).select().single());
      }
      if (error) {
        console.error("Failed to add event:", error.message);
        alert(`Couldn't add event: ${error.message}`);
        return;
      }
      if (data) setEvents((prev) => [...prev, eventFromRow(data)].sort((a, b) => a.date.localeCompare(b.date)));
    },
    updateEvent: async (id, e) => {
      const patch: Record<string, unknown> = {};
      if (e.title !== undefined) patch.title = e.title;
      if (e.type !== undefined) patch.type = e.type;
      if (e.date !== undefined) patch.event_date = normalizeEventDateForStorage(e.date);
      if (e.mode !== undefined) patch.mode = e.mode;
      if (e.description !== undefined) patch.description = e.description;
      if (e.venue !== undefined) patch.venue = e.venue;
      if (e.maxParticipants !== undefined) patch.max_participants = e.maxParticipants;
      if (e.registrationOpen !== undefined) patch.registration_open = e.registrationOpen;
      if (e.registrationForm !== undefined) patch.registration_form = e.registrationForm;
      if (e.prizes !== undefined) patch.prizes = e.prizes;
      if (e.teamSizeMax !== undefined) patch.team_size_max = e.teamSizeMax;
      if (e.rules !== undefined) patch.rules = e.rules;
      if (e.meetingLink !== undefined) patch.meeting_link = e.meetingLink || null;
      if (e.teamRegistration !== undefined) patch.team_registration = e.teamRegistration;
      if (e.isCancelled !== undefined) patch.is_cancelled = e.isCancelled;

      let { error } = await supabase.from("events").update(patch).eq("id", id);
      if (isMissingV6Column(error?.message)) {
        ({ error } = await supabase.from("events").update(withoutV6Columns(patch)).eq("id", id));
      }
      if (error) {
        console.error("Failed to update event:", error.message);
        alert(`Couldn't save event: ${error.message}`);
        return;
      }
      setEvents((prev) => prev.map((x) => (x.id === id ? { ...x, ...e } : x)));
    },
    deleteEvent: async (id) => {
      await supabase.from("events").delete().eq("id", id);
      setEvents((prev) => prev.filter((x) => x.id !== id));
    },

    addResource: async (r) => {
      const { data, error } = await supabase
        .from("resources")
        .insert({
          title: r.title,
          description: r.description,
          type: r.type,
          file_url: r.url,
          size_label: r.size,
          thumbnail: r.thumbnail,
          course_id: r.courseId,
          module_id: r.moduleId,
          visibility: r.visibility,
          download_allowed: r.downloadAllowed,
          preview_allowed: r.previewAllowed,
          uploaded_by: r.uploadedBy,
          ...(r.displayOrder !== undefined ? { display_order: r.displayOrder } : {}),
          ...(r.materialCategory ? { material_category: r.materialCategory } : {}),
        })
        .select()
        .single();
      if (error) {
        console.error("Failed to add resource:", error.message);
        alert(`Couldn't add resource: ${error.message}`);
        return;
      }
      if (data) setResources((prev) => [resourceFromRow(data), ...prev]);
    },
    updateResource: async (id, r) => {
      const patch: Record<string, unknown> = {};
      if (r.title !== undefined) patch.title = r.title;
      if (r.description !== undefined) patch.description = r.description;
      if (r.type !== undefined) patch.type = r.type;
      if (r.url !== undefined) patch.file_url = r.url;
      if (r.size !== undefined) patch.size_label = r.size;
      if (r.visibility !== undefined) patch.visibility = r.visibility;
      if (r.downloadAllowed !== undefined) patch.download_allowed = r.downloadAllowed;
      if (r.previewAllowed !== undefined) patch.preview_allowed = r.previewAllowed;
      await supabase.from("resources").update(patch).eq("id", id);
      setResources((prev) => prev.map((x) => (x.id === id ? { ...x, ...r } : x)));
    },
    deleteResource: async (id) => {
      await supabase.from("resources").delete().eq("id", id);
      setResources((prev) => prev.filter((x) => x.id !== id));
    },
    trackResourceView: async (id) => {
      setResources((prev) => prev.map((x) => (x.id === id ? { ...x, views: x.views + 1 } : x)));
      const current = resources.find((x) => x.id === id);
      if (current) await supabase.from("resources").update({ views: current.views + 1 }).eq("id", id);
    },
    trackResourceDownload: async (id) => {
      setResources((prev) => prev.map((x) => (x.id === id ? { ...x, downloads: x.downloads + 1 } : x)));
      const current = resources.find((x) => x.id === id);
      if (current) await supabase.from("resources").update({ downloads: current.downloads + 1 }).eq("id", id);
    },

    addLearningPath: async (p) => {
      const { data, error } = await supabase
        .from("learning_paths")
        .insert({ title: p.title, level: p.level, courses: p.courses ?? 0 })
        .select()
        .single();
      if (error) {
        console.error("Failed to add learning path:", error.message);
        alert(`Couldn't add learning path: ${error.message}`);
        return;
      }
      if (data) setLearningPathRows((prev) => [...prev, data as any]);
    },
    updateLearningPath: async (id, p) => {
      await supabase.from("learning_paths").update(p).eq("id", id);
      setLearningPathRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
    },
    deleteLearningPath: async (id) => {
      await supabase.from("learning_paths").delete().eq("id", id);
      setLearningPathRows((prev) => prev.filter((x) => x.id !== id));
    },

    addReview: async (r) => {
      const { data } = await supabase
        .from("reviews")
        .insert({ course_id: r.courseId, student_id: r.userId, user_name: r.userName, rating: r.rating, comment: r.comment })
        .select()
        .single();
      if (data) setReviews((prev) => [reviewFromRow(data), ...prev]);
    },
    deleteReview: async (id) => {
      await supabase.from("reviews").delete().eq("id", id);
      setReviews((prev) => prev.filter((x) => x.id !== id));
    },
    hasReviewed: (courseId, userId) => reviews.some((r) => r.courseId === courseId && r.userId === userId),

    addNotification: async (n) => {
      const { data } = await supabase
        .from("notifications")
        .insert({ user_id: n.userId, title: n.title, message: n.body, type: n.type, link: n.link })
        .select()
        .single();
      if (data && n.userId === userRef.current?.id) setNotifications((prev) => [notificationFromRow(data), ...prev]);
    },
    markNotificationRead: async (id) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
    markAllNotificationsRead: async (userId) => {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId);
      setNotifications((prev) => prev.map((n) => (n.userId === userId ? { ...n, read: true } : n)));
    },

    updateSiteSettings: async (settings) => {
      const patch: Record<string, unknown> = {};
      if (settings.heroTitle !== undefined) patch.hero_title = settings.heroTitle;
      if (settings.heroDescription !== undefined) patch.hero_description = settings.heroDescription;
      if (settings.contactEmail !== undefined) patch.contact_email = settings.contactEmail;
      if (settings.contactPhone !== undefined) patch.contact_phone = settings.contactPhone;
      if (settings.statMembers !== undefined) patch.stat_members = settings.statMembers;
      if (settings.statEvents !== undefined) patch.stat_events = settings.statEvents;
      if (settings.statCertificates !== undefined) patch.stat_certificates = settings.statCertificates;
      if (settings.statProjects !== undefined) patch.stat_projects = settings.statProjects;
      if (settings.platformName !== undefined) patch.platform_name = settings.platformName;
      if (settings.universityName !== undefined) patch.university_name = settings.universityName;
      if (settings.maintenanceMode !== undefined) patch.maintenance_mode = settings.maintenanceMode;
      if (settings.allowRegistrations !== undefined) patch.allow_registrations = settings.allowRegistrations;
      await supabase.from("site_settings").update(patch).eq("id", true);
      setSiteSettings((prev) => ({ ...prev, ...settings }));
    },

    addAnnouncement: async (a) => {
      const { data, error } = await supabase
        .from("announcements")
        .insert({ title: a.title, message: a.message, created_by: userRef.current?.id })
        .select()
        .single();
      if (error) {
        alert(`Couldn't post announcement: ${error.message}`);
        return;
      }
      if (data) setAnnouncements((prev) => [announcementFromRow(data), ...prev]);
    },
    deleteAnnouncement: async (id) => {
      await supabase.from("announcements").delete().eq("id", id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
