"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Trophy, Users, Check, Video } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";
import { HackathonRegistrationForm } from "@/components/HackathonRegistrationForm";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useEventRegistration } from "@/context/EventRegistrationContext";
import { getEventStatus } from "@/lib/eventDates";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { events } = useData();
  const { user } = useAuth();
  const { isRegistered, register, registrationCount, unregister } = useEventRegistration();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const event = events.find((e) => e.id === id);
  if (!event) {
    return (
      <div className="pt-32 pb-20 container-page text-center">
        <p className="text-paragraph-dark">Event not found.</p>
        <Link href="/events" className="text-orange mt-4 inline-block">← Back to events</Link>
      </div>
    );
  }

  const date = new Date(event.date);
  const status = getEventStatus(event.date, { cancelled: event.isCancelled });
  const count = registrationCount(event.id);
  const full = event.maxParticipants ? count >= event.maxParticipants : false;
  const registered = user ? isRegistered(event.id) : false;
  const finished = status === "Completed" || status === "Cancelled";
  const closed = event.registrationOpen === false || full || finished;

  async function handleRegister(data: { formResponses: Record<string, string>; teamName?: string }) {
    if (!user) {
      router.push(`/login?redirect=/events/${id}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await register(event!.id, data);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <GridBackground className="pt-28 pb-16 min-h-screen">
      <div className="container-page max-w-4xl">
        <Link href={event.type === "Hackathon" ? "/hackathons" : "/events"} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-orange mb-8">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={event.type === "Hackathon" ? "badge-hackathon" : "badge-workshop"}>{event.type}</span>
                <EventStatusBadge status={status} />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 font-heading">{event.title}</h1>
              <p className="text-white/70 mt-4 leading-relaxed">{event.description}</p>
            </div>

            {event.rules && (
              <div className="card-grid !bg-navy/80 !border-border-dark p-6">
                <h3 className="font-heading font-semibold text-white mb-3">Rules & Guidelines</h3>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{event.rules}</p>
              </div>
            )}

            {event.prizes && (
              <div className="card-grid !bg-navy/80 !border-border-dark p-6">
                <h3 className="font-heading font-semibold text-white mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-orange" /> Prizes
                </h3>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{event.prizes}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="card-grid !bg-card-dark !border-border-dark p-6 sticky top-24 space-y-5">
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 text-white/80">
                  <Calendar className="h-4 w-4 text-orange" />
                  {date.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="flex items-center gap-2 text-white/80">
                  <MapPin className="h-4 w-4 text-orange" />
                  {event.mode}{event.venue ? ` — ${event.venue}` : ""}
                </p>
                {event.maxParticipants && (
                  <p className="flex items-center gap-2 text-white/80">
                    <Users className="h-4 w-4 text-orange" />
                    {count} / {event.maxParticipants} registered
                  </p>
                )}
                {event.teamSizeMax && event.type === "Hackathon" && (
                  <p className="text-white/60 text-xs">Max team size: {event.teamSizeMax}</p>
                )}
              </div>

              {event.meetingLink && (
                registered || success ? (
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-skyblue/40 bg-skyblue/10 px-4 py-3 text-sm font-semibold text-skyblue hover:bg-skyblue/20 transition-colors"
                  >
                    <Video className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Join the online session</span>
                  </a>
                ) : (
                  <p className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs text-white/50">
                    <Video className="h-4 w-4 flex-shrink-0 text-skyblue" />
                    A meeting link is available after you register.
                  </p>
                )
              )}

              {registered || success ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                  <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-semibold">You&apos;re registered!</p>
                  <Link href="/dashboard/student/events" className="text-sm text-orange mt-2 inline-block">View in dashboard →</Link>
                  <button onClick={() => unregister(event.id)} className="block w-full mt-3 text-xs text-white/50 hover:text-red-400">
                    Cancel registration
                  </button>
                </div>
              ) : closed ? (
                <p className="text-center text-sm text-white/50 py-4">
                  {status === "Cancelled"
                    ? "This event was cancelled."
                    : status === "Completed"
                      ? "This event has already taken place."
                      : full
                        ? "Registration full — check back for future events."
                        : "Registration is closed."}
                </p>
              ) : !user ? (
                <div className="text-center space-y-3">
                  <p className="text-sm text-white/60">Login to register for this event.</p>
                  <Link href={`/login?redirect=/events/${id}`} className="btn-primary w-full">Login to Register</Link>
                  <Link href="/request-credentials" className="text-sm text-orange">Request credentials</Link>
                </div>
              ) : (
                <>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <HackathonRegistrationForm event={event} onSubmit={handleRegister} submitting={submitting} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </GridBackground>
  );
}
