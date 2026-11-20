"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, ArrowRight, Calendar, Users } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";
import { SectionHeading } from "@/components/SectionHeading";
import { useData } from "@/context/DataContext";
import { useEventRegistration } from "@/context/EventRegistrationContext";
import { EventStatusBadge } from "@/components/EventStatusBadge";
import { getEventStatus } from "@/lib/eventDates";

export default function HackathonsPage() {
  const { events } = useData();
  const { registrationCount } = useEventRegistration();
  const hackathons = events
    .filter((e) => e.type === "Hackathon")
    .map((e) => ({ event: e, status: getEventStatus(e.date, { cancelled: e.isCancelled }) }))
    .sort((a, b) => {
      const aDone = a.status === "Completed" ? 1 : 0;
      const bDone = b.status === "Completed" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.event.date.localeCompare(b.event.date);
    });

  return (
    <GridBackground className="pt-32 pb-20 min-h-screen">
      <div className="container-page">
        <SectionHeading
          eyebrow="Build & Compete"
          title="Student Hackathons"
          description="Register for AWS SBG hackathons — build real cloud projects, compete with peers, and win prizes."
          light
        />

        {hackathons.length === 0 && (
          <div className="mt-16 text-center card-grid !bg-navy/60 !border-border-dark p-12 max-w-lg mx-auto">
            <Trophy className="h-12 w-12 text-orange mx-auto mb-4" />
            <p className="text-white/70">No hackathons scheduled yet. Check back soon!</p>
          </div>
        )}

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {hackathons.map(({ event: e, status }, i) => {
            const date = new Date(e.date);
            const count = registrationCount(e.id);
            const spotsLeft = e.maxParticipants ? e.maxParticipants - count : null;

            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i, 6) * 0.08 }}
              >
                <Link
                  href={`/events/${e.id}`}
                  className={`block card-grid !bg-card-dark !border-border-dark hover-lift p-6 h-full group ${
                    status === "Completed" || status === "Cancelled" ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-hackathon"><Trophy className="h-3 w-3" /> Hackathon</span>
                    <EventStatusBadge status={status} />
                  </div>
                  <h3 className="text-xl font-bold text-white mt-4 font-heading group-hover:text-orange transition-colors">{e.title}</h3>
                  <p className="text-sm text-white/60 mt-2 line-clamp-2">{e.description}</p>

                  <div className="mt-5 flex flex-wrap gap-4 text-xs text-white/50 font-mono">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-orange" />{date.toLocaleDateString()}</span>
                    <span>{e.mode}</span>
                    {e.maxParticipants && (
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-orange" />{count}/{e.maxParticipants}</span>
                    )}
                    {spotsLeft !== null && spotsLeft <= 10 && spotsLeft > 0 && (
                      <span className="text-orange font-semibold">{spotsLeft} spots left!</span>
                    )}
                  </div>

                  {e.prizes && (
                    <p className="mt-3 text-xs text-orange/80 line-clamp-1">🏆 {e.prizes}</p>
                  )}

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-orange group-hover:gap-2.5 transition-all">
                    {status === "Completed" ? "View results" : status === "Cancelled" ? "View details" : "Register now"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GridBackground>
  );
}
