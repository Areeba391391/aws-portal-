"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useVtms } from "@/context/VtmsContext";

export function MigrationNotice() {
  return (
    <div className="card-surface p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">Training database update</h1>
      <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-2">
        The training tables are not on this Supabase project yet. In the Supabase SQL Editor, run the full script
        <span className="font-mono"> scripts/migrate-v7-vtms.sql</span>. Existing tables and records are not deleted.
      </p>
    </div>
  );
}

export function TrainingList({ audience }: { audience: "admin" | "team" | "student" }) {
  const { courses } = useData();
  const { user } = useAuth();
  const { staff, enrolments, ready, migrationRequired, error } = useVtms();
  const base = `/dashboard/${audience}/training`;

  if (!ready) return <p className="text-sm text-paragraph-light dark:text-paragraph-dark">Loading training records…</p>;
  if (migrationRequired) return <MigrationNotice />;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  const mine = staff.filter((item) => item.userId === user?.id);
  const visible =
    audience === "admin"
      ? courses
      : audience === "team"
        ? courses.filter((course) => mine.some((item) => item.courseId === course.id))
        : courses.filter((course) => enrolments.some((item) => item.courseId === course.id && item.studentId === user?.id));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">Training</h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
          {audience === "admin"
            ? "Open a course to assign staff, manage tasks and projects, and review examinations."
            : audience === "team"
              ? "Courses assigned to you as course admin or supervisor."
              : "Tasks, projects, materials, and examination status for your enrolled courses."}
        </p>
      </div>
      {visible.length === 0 ? (
        <div className="card-surface p-6">
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark">
            {audience === "team"
              ? "No course assignment yet. A super admin assigns course admins and supervisors from Training."
              : audience === "student"
                ? "You have not enrolled in a course yet."
                : "No courses yet. Create one from Courses & Resources."}
          </p>
          {audience === "student" && (
            <Link href="/courses" className="text-orange font-semibold text-sm mt-3 inline-block">Browse courses →</Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((course) => {
            const roles = mine.filter((item) => item.courseId === course.id).map((item) => item.assignmentRole);
            return (
              <Link key={course.id} href={`${base}/${course.id}`} className="card-surface p-5 hover-lift block">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading font-semibold text-heading-light dark:text-heading-dark">{course.title}</p>
                    <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-1">{course.category || course.level}</p>
                  </div>
                  <span className="text-xs font-semibold text-orange">{course.status}</span>
                </div>
                {audience === "team" && roles.length > 0 && (
                  <p className="text-xs text-paragraph-light dark:text-paragraph-dark mt-3">
                    {roles.map((role) => (role === "course_admin" ? "Course Admin" : "Supervisor")).join(" · ")}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
