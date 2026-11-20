"use client";

import { Hero } from "@/components/Hero";
import { SectionHeading } from "@/components/SectionHeading";
import { FeatureCard } from "@/components/FeatureCard";
import { CourseCard } from "@/components/CourseCard";
import { EventCard } from "@/components/EventCard";
import { useData } from "@/context/DataContext";
import { Cloud, Presentation, FlaskConical, Users2, ArrowRight, CalendarClock } from "lucide-react";
import Link from "next/link";
import { isEventUpcoming } from "@/lib/eventDates";

const features = [
  { icon: Cloud, title: "Cloud Learning", description: "Structured learning paths from Cloud Practitioner to Solutions Architect." },
  { icon: Presentation, title: "AWS Workshops", description: "Live sessions with hands-on guidance from experienced mentors." },
  { icon: FlaskConical, title: "Hands-on Labs", description: "Practice on real AWS environments, not just theory." },
  { icon: Users2, title: "Student Community", description: "Connect, collaborate, and grow with fellow cloud builders." },
];

export default function HomePage() {
  const { courses, events } = useData();
  const upcomingEvents = events
    .filter((event) => !event.isCancelled && isEventUpcoming(event.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <>
      <Hero />

      {/* Features */}
      <section className="section-padding bg-bg-light dark:bg-bg-dark">
        <div className="container-page">
          <SectionHeading
            eyebrow="Why AWS SBG UET Taxila"
            title="Everything you need to grow on AWS"
            description="From guided learning paths to real hands-on labs, we equip student builders with practical cloud skills."
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="section-padding bg-card-light dark:bg-navy-dark/40">
        <div className="container-page">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <SectionHeading eyebrow="Learning Paths" title="Featured courses" />
            <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:gap-2.5 transition-all duration-300">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.slice(0, 4).map((c, i) => (
              <Link key={c.id} href={`/courses/${c.id}`} className="block">
                <CourseCard course={c} index={i} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="section-padding bg-bg-light dark:bg-bg-dark">
        <div className="container-page max-w-3xl">
          <SectionHeading
            eyebrow="Stay Updated"
            title="Upcoming events"
            description="Workshops, hackathons, and bootcamps happening across our community — online and onsite."
          />
          <div className="mt-8 space-y-4">
            {upcomingEvents.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} />
            ))}
            {upcomingEvents.length === 0 && (
              <div className="card-surface p-8 text-center">
                <CalendarClock className="mx-auto h-8 w-8 text-orange/60" />
                <p className="mt-3 text-sm text-paragraph-light dark:text-paragraph-dark">
                  No events are scheduled right now. New workshops and hackathons will appear here.
                </p>
              </div>
            )}
          </div>
          <Link href="/events" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:gap-2.5 transition-all duration-300">
            View all events <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-page">
          <div className="rounded-3xl bg-gradient-orange p-10 md:p-16 text-center relative overflow-hidden">
            <h2 className="text-3xl md:text-4xl font-bold text-white max-w-xl mx-auto">
              Ready to build your cloud future?
            </h2>
            <p className="mt-4 text-white/90 max-w-md mx-auto">
              Request access to the invite-only AWS SBG UET Taxila learning portal.
            </p>
            <Link
              href="/request-credentials"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy px-7 py-3.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Request Credentials <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
