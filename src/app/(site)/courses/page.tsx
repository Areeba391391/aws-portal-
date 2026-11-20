"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, BookOpen, Filter } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";
import { SectionHeading } from "@/components/SectionHeading";
import { CourseCard } from "@/components/CourseCard";
import { useData } from "@/context/DataContext";

const tabs = ["All", "Beginner", "Intermediate", "Advanced"] as const;

export default function CoursesPage() {
  const { courses } = useData();
  const [active, setActive] = useState<(typeof tabs)[number]>("All");
  const [search, setSearch] = useState("");

  const published = courses.filter((c) => c.status === "Active");

  const filtered = useMemo(() => {
    let list = active === "All" ? published : published.filter((c) => c.level === active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          (c.category ?? "").toLowerCase().includes(q) ||
          (c.instructor ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [published, active, search]);

  return (
    <GridBackground className="pt-32 pb-20 min-h-screen">
      <div className="container-page">
        <SectionHeading
          eyebrow="Course Library"
          title="Learn AWS Cloud"
          description="Browse our full course library — beginner to advanced tracks in AI, cloud, mobile, and development. Certificates require a physical final assessment."
          light
        />

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="input-field !pl-11 !bg-navy/60 !border-border-dark !text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className={`px-4 py-2 rounded-full text-sm font-mono font-semibold transition-all duration-300 ${
                  active === tab
                    ? "bg-orange text-white shadow-lift"
                    : "bg-navy/60 border border-border-dark text-white/60 hover:border-orange hover:text-orange"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm text-white/50 font-mono flex items-center gap-2">
          <Filter className="h-3.5 w-3.5" />
          {filtered.length} course{filtered.length !== 1 ? "s" : ""} available
        </p>

        {filtered.length === 0 && (
          <div className="mt-16 text-center card-grid !bg-navy/60 !border-border-dark p-12 max-w-lg mx-auto">
            <BookOpen className="h-12 w-12 text-orange mx-auto mb-4" />
            <p className="text-white/70">
              {search ? "No courses match your search." : "No courses published yet — check back soon."}
            </p>
          </div>
        )}

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((c, i) => (
            <Link key={c.id} href={`/courses/${c.id}`} className="block">
              <CourseCard course={c} index={i} />
            </Link>
          ))}
        </div>
      </div>
    </GridBackground>
  );
}
