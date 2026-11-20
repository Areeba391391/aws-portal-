"use client";

import { useMemo } from "react";
import { CalendarClock, Video } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { useData } from "@/context/DataContext";
import { useEventRegistration } from "@/context/EventRegistrationContext";
import { formatEventDateLabel, getEventStatus } from "@/lib/eventDates";

export default function StudentEventsPage() {
  const { events } = useData();
  const { isRegistered } = useEventRegistration();

  const { mine, open } = useMemo(() => {
    const decorated = events.map((event) => ({
      event,
      status: getEventStatus(event.date, { cancelled: event.isCancelled }),
      registered: isRegistered(event.id),
    }));
    return {
      mine: decorated
        .filter((e) => e.registered && e.status !== "Completed")
        .sort((a, b) => a.event.date.localeCompare(b.event.date)),
      open: decorated
        .filter((e) => !e.registered && e.status !== "Completed" && e.status !== "Cancelled")
        .sort((a, b) => a.event.date.localeCompare(b.event.date)),
    };
  }, [events, isRegistered]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-heading-light dark:text-heading-dark">Events</h1>
        <p className="text-sm text-paragraph-light dark:text-paragraph-dark mt-1">
          Register for upcoming workshops, hackathons, bootcamps, and seminars.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-heading font-semibold text-heading-light dark:text-heading-dark">My registrations</h2>
        {mine.length === 0 ? (
          <div className="card-surface p-8 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-orange/60" />
            <p className="mt-3 text-sm text-paragraph-light dark:text-paragraph-dark">
              You have not registered for any upcoming events yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map(({ event, status }) => (
              <div key={event.id} className="card-surface flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-orange">{event.type}</span>
                    <EventStatusBadge status={status} />
                  </div>
                  <h3 className="mt-1 truncate font-heading font-semibold text-heading-light dark:text-heading-dark">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs text-paragraph-light dark:text-paragraph-dark">
                    {formatEventDateLabel(event.date)} · {event.mode}
                    {event.venue ? ` — ${event.venue}` : ""}
                  </p>
                </div>
                {event.meetingLink && status !== "Cancelled" && (
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-skyblue/10 px-4 py-2 text-xs font-semibold text-skyblue transition-colors hover:bg-skyblue hover:text-white"
                  >
                    <Video className="h-3.5 w-3.5" /> Join session
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-heading font-semibold text-heading-light dark:text-heading-dark">Open for registration</h2>
        {open.length === 0 ? (
          <p className="text-sm text-paragraph-light dark:text-paragraph-dark">
            Nothing new right now — check back soon.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {open.map(({ event }, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
