"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Trophy } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";
import { SectionHeading } from "@/components/SectionHeading";
import { EventCard } from "@/components/EventCard";
import { useData } from "@/context/DataContext";
import { getEventStatus } from "@/lib/eventDates";

/** Hackathons have their own page — this listing covers the other formats. */
const categories = ["All", "Workshop", "Bootcamp", "Seminar"] as const;
const timeframes = ["Upcoming", "Past"] as const;

export default function EventsPage() {
  const { events } = useData();
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [timeframe, setTimeframe] = useState<(typeof timeframes)[number]>("Upcoming");

  const nonHackathons = useMemo(
    () =>
      events
        .filter((e) => e.type !== "Hackathon")
        .map((event) => ({ event, status: getEventStatus(event.date, { cancelled: event.isCancelled }) })),
    [events]
  );

  const visible = nonHackathons
    .filter(({ event, status }) => {
      const matchesCategory = category === "All" || event.type === category;
      const isPast = status === "Completed";
      return matchesCategory && (timeframe === "Past" ? isPast : !isPast);
    })
    .sort((a, b) =>
      timeframe === "Past" ? b.event.date.localeCompare(a.event.date) : a.event.date.localeCompare(b.event.date)
    );

  return (
    <GridBackground className="pt-32 pb-20 min-h-screen">
      <div className="container-page">
        <SectionHeading
          eyebrow="Stay Updated"
          title="Workshops, bootcamps & seminars"
          description="Filter by format to find the sessions that fit you. Looking to compete? Hackathons live on their own page."
          light
        />

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  category === c ? "bg-orange text-white" : "border border-white/20 text-white/70 hover:border-orange/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-white/20 p-1">
            {timeframes.map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  timeframe === t ? "bg-orange text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 && (
          <div className="mt-14 mx-auto max-w-lg text-center card-grid !bg-navy/60 !border-border-dark p-12">
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-orange" />
            <p className="text-white/70">
              {timeframe === "Past"
                ? "No past events in this category yet."
                : "No upcoming events in this category yet — check back soon."}
            </p>
          </div>
        )}

        <div className="mt-8 grid md:grid-cols-2 gap-5 max-w-5xl">
          {visible.map(({ event }, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>

        <Link
          href="/hackathons"
          className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-orange hover:gap-3 transition-all"
        >
          <Trophy className="h-4 w-4" /> Browse hackathons →
        </Link>
      </div>
    </GridBackground>
  );
}
