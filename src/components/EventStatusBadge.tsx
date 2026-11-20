import { EventStatus, eventStatusStyles } from "@/lib/eventDates";

export function EventStatusBadge({ status, className = "" }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${eventStatusStyles[status]} ${className}`}
    >
      {status === "Ongoing" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      {status}
    </span>
  );
}
