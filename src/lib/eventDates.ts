/** Compare event calendar days in local time (avoids UTC-midnight hiding same-day events). */
export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isEventUpcoming(eventDateIso: string, now = new Date()) {
  const eventDay = startOfLocalDay(new Date(eventDateIso));
  const today = startOfLocalDay(now);
  return eventDay >= today;
}

/** Form input is YYYY-MM-DD — store late in that UTC day so listings stay sensible globally. */
export function normalizeEventDateForStorage(date: string) {
  if (date.includes("T")) return date;
  return `${date}T23:59:59.999Z`;
}

export function formatEventDateLabel(eventDateIso: string) {
  return new Date(eventDateIso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Turn the stored date into a value the `<input type="date">` control accepts. */
export function toDateInputValue(eventDateIso: string) {
  const date = new Date(eventDateIso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

export type EventStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";

/**
 * Events are stored with a single calendar day, so "Ongoing" means the event
 * day is today and "Completed" means the day has passed in the viewer's timezone.
 */
export function getEventStatus(
  eventDateIso: string,
  options: { cancelled?: boolean } = {},
  now = new Date()
): EventStatus {
  if (options.cancelled) return "Cancelled";
  const eventDay = startOfLocalDay(new Date(eventDateIso)).getTime();
  const today = startOfLocalDay(now).getTime();
  if (eventDay > today) return "Upcoming";
  if (eventDay === today) return "Ongoing";
  return "Completed";
}

export const eventStatusStyles: Record<EventStatus, string> = {
  Upcoming: "bg-skyblue/15 text-skyblue border-skyblue/30",
  Ongoing: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Completed: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  Cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const httpUrl = /^https?:\/\/[^\s]+\.[^\s]{2,}$/i;

export function isValidMeetingLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!httpUrl.test(trimmed)) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}
