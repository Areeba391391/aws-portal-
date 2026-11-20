"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Video } from "lucide-react";
import { EventItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useEventRegistration } from "@/context/EventRegistrationContext";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { getEventStatus } from "@/lib/eventDates";

export function EventCard({ event, index = 0 }: { event: EventItem; index?: number }) {
  const date = new Date(event.date);
  const status = getEventStatus(event.date, { cancelled: event.isCancelled });
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = date.getDate();
  const { user } = useAuth();
  const router = useRouter();
  const { isRegistered, registrationCount } = useEventRegistration();
  const registered = user ? isRegistered(event.id) : false;
  const count = registrationCount(event.id);

  function handleClick() {
    router.push(`/events/${event.id}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="card-grid hover-lift p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-navy flex flex-col items-center justify-center text-white border border-orange/20">
        <span className="text-[10px] font-semibold text-orange font-mono">{month}</span>
        <span className="font-numbers text-xl font-bold">{day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={event.type === "Hackathon" ? "badge-hackathon" : "text-[11px] font-semibold uppercase tracking-wide text-orange font-mono"}>
            {event.type}
          </span>
          <EventStatusBadge status={status} />
        </div>
        <h4 className="font-heading font-semibold text-heading-light dark:text-heading-dark truncate mt-1">
          {event.title}
        </h4>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-paragraph-light dark:text-paragraph-dark mt-1">
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {event.mode}</span>
          {event.maxParticipants && <span>· {count}/{event.maxParticipants} spots</span>}
          {event.meetingLink && (
            <span className="flex items-center gap-1 text-skyblue"><Video className="h-3.5 w-3.5" /> Online link</span>
          )}
        </p>
      </div>
      <div className="flex-shrink-0 w-full sm:w-auto">
        {registered ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold bg-emerald-500/10 text-emerald-500 w-full sm:w-auto justify-center">
            Registered ✓
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold bg-orange/10 text-orange hover:bg-orange hover:text-white transition-all w-full sm:w-auto justify-center">
            {status === "Completed" || status === "Cancelled" ? "View" : event.type === "Hackathon" ? "Register" : "Details"}{" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </motion.div>
  );
}
