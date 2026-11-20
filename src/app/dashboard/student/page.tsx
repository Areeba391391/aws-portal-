"use client";

import Link from "next/link";
import { BookOpen, Award, CalendarClock, Megaphone, FolderOpen } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/dashboard/ProgressBar";
import { EventCard } from "@/components/EventCard";
import { ResourceCard } from "@/components/ResourceCard";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useEnrollment } from "@/context/EnrollmentContext";
import { useVtms } from "@/context/VtmsContext";

export default function StudentDashboardPage() {
  const { events, resources, courses, announcements } = useData();
  const { user } = useAuth();
  const { myEnrollments, getCourseProgress, stats } = useEnrollment();
  const { migrationRequired } = useVtms();
  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const globalAnnouncements = announcements.filter((item) => !item.courseId);

  const enrollments = myEnrollments();
  const enrolledCourses = enrollments
    .map((e) => courses.find((c) => c.id === e.courseId))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">
          Hello {firstName} 👋
        </h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
          Keep learning, keep building.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={BookOpen} label="In Progress" value={stats.inProgress} accent="blue" index={0} />
        <StatCard icon={Award} label="Completed" value={stats.completed} accent="green" index={1} />
        <StatCard icon={Award} label="Certificates" value={stats.certificates} accent="orange" index={2} />
        <StatCard icon={CalendarClock} label="Upcoming Events" value={events.length} accent="purple" index={3} />
      </div>

      {globalAnnouncements.length > 0 && (
        <div className="card-surface p-6 border-orange/20">
          <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-orange" /> Announcements
          </h3>
          <div className="space-y-3">
            {globalAnnouncements.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-xl bg-orange/5 border border-orange/10 p-4">
                <p className="font-semibold text-sm text-heading-light dark:text-heading-dark">{a.title}</p>
                <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-1">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-surface p-6">
        <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark">Training</h3>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
          Tasks, projects, your supervisor, the course WhatsApp group, and examination status.
        </p>
        {migrationRequired ? (
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-3">Training records will appear after the database update is applied.</p>
        ) : (
          <Link href="/dashboard/student/training" className="text-orange font-semibold text-sm mt-3 inline-block">Open training →</Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-surface p-6">
          <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark mb-5">
            Learning Progress
          </h3>
          {enrolledCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-paragraph-light dark:text-paragraph-dark">
                You haven't enrolled in any course yet.
              </p>
              <Link href="/courses" className="text-orange font-semibold text-sm mt-3 inline-block">
                Browse courses →
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {enrolledCourses.map((c) => (
                <Link key={c.id} href={`/dashboard/student/learn/${c.id}`} className="block">
                  <ProgressBar value={getCourseProgress(c)} label={c.title} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface p-6">
          <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark mb-5">
            Upcoming Event
          </h3>
          {events[0] ? <EventCard event={events[0]} /> : (
            <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No events scheduled yet.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-5">
          <FolderOpen className="h-5 w-5 text-orange" />
          <h3 className="font-heading font-semibold text-heading-light dark:text-heading-dark">
            Recent Resources
          </h3>
        </div>
        {resources.length === 0 ? (
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark">No resources added yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.slice(0, 3).map((r, i) => (
              <ResourceCard key={r.id} resource={r} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
