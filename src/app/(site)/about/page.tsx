"use client";

import { motion } from "framer-motion";
import { Quote, Crown, Users, MapPin, Calendar } from "lucide-react";
import { GridBackground } from "@/components/GridBackground";
import { SectionHeading } from "@/components/SectionHeading";

const foundingTeam = [
  { name: "Abuzar Shahid", role: "Director of Operations" },
  { name: "Ujala Sahar", role: "Director of Strategy and Innovation" },
  { name: "Afreen Gul", role: "Technical Lead" },
  { name: "Maham Fatima", role: "Director of Coordination" },
  { name: "Wajahat Hussain", role: "Director of Outreach" },
  { name: "Rai Rian", role: "Director of Finance" },
  { name: "Sameer Abrar", role: "Director of Media and Branding" },
  { name: "Ahmed Basil", role: "Diplomatic Officer" },
  { name: "Mirza Airaf", role: "Technical Support Officer I" },
  { name: "Yousaf Leghari", role: "Technical Support Officer II" },
  { name: "Areeba Ali", role: "Communications Officer" },
  { name: "Shameen Shams", role: "Creative Content Officer" },
  { name: "Muhammad Asif", role: "Cloud Integrations Officer" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AboutPage() {
  return (
    <GridBackground className="pt-32 pb-20 min-h-screen">
      <div className="container-page space-y-24">
        {/* Origin story */}
        <section className="max-w-3xl">
          <SectionHeading
            eyebrow="About AWS SBG UET Taxila"
            title="AWS SBG UET Taxila"
            description="Founded in 2026 at the University of Engineering and Technology, Taxila — AWS SBG UET Taxila is a student-led community empowering peers to learn, build, and innovate on AWS Cloud."
            light
          />
          <div className="mt-8 flex flex-wrap gap-4 text-sm font-mono text-white/60">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-dark bg-navy/60 px-4 py-2">
              <Calendar className="h-4 w-4 text-orange" /> Founded 2026
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border-dark bg-navy/60 px-4 py-2">
              <MapPin className="h-4 w-4 text-orange" /> UET Taxila
            </span>
          </div>
        </section>

        {/* Founder & leader */}
        <section className="card-grid !bg-card-dark !border-border-dark p-8 md:p-12">
          <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">
            <div className="flex flex-col items-center md:items-start">
              <div className="h-24 w-24 rounded-2xl bg-gradient-orange flex items-center justify-center text-white text-2xl font-bold shadow-glow">
                ZM
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 badge-hackathon">
                <Crown className="h-3.5 w-3.5" /> Founder & Leader
              </span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white font-heading">Zakwan Mustafa</h2>
              <p className="mt-2 text-white/60 text-sm font-mono">Founder & Current Leader · AWS SBG UET Taxila</p>
              <p className="mt-5 text-white/80 leading-relaxed max-w-2xl">
                Zakwan Mustafa founded AWS Student Builders Group at UET Taxila in 2026 with a clear belief:
                technology should be accessible to every student who is ready to learn — when the opportunity
                meets them at the right moment.
              </p>
              <blockquote className="mt-8 relative rounded-xl border border-orange/20 bg-orange/5 p-6">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-orange/20" />
                <p className="text-lg md:text-xl text-white font-heading leading-relaxed italic">
                  &ldquo;Everyone can be good at tech if they are given an opportunity at the right time.&rdquo;
                </p>
                <footer className="mt-4 text-sm text-orange font-mono">— Zakwan Mustafa, Founder</footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Founding team */}
        <section>
          <SectionHeading
            eyebrow="The People Behind It"
            title="Founding Team"
            description="The leaders who built AWS SBG from the ground up at UET Taxila."
            center
            light
          />
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {foundingTeam.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="card-grid !bg-navy/70 !border-border-dark hover-lift p-5 text-center"
              >
                <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-orange flex items-center justify-center text-white text-sm font-bold mb-3 shadow-glow">
                  {initials(member.name)}
                </div>
                <p className="font-heading font-semibold text-sm text-white leading-snug">{member.name}</p>
                <p className="text-[11px] text-orange/90 mt-2 font-mono leading-relaxed">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Mission strip */}
        <section className="brand-bar rounded-xl !text-left flex flex-col sm:flex-row items-center gap-4 !py-5 !px-8">
          <Users className="h-8 w-8 flex-shrink-0 hidden sm:block" />
          <p className="text-sm md:text-base">
            <strong>AWS SBG UET Taxila</strong> — empowering students with cloud skills,
            hands-on labs, hackathons, and a community that believes everyone can excel in tech.
          </p>
        </section>
      </div>
    </GridBackground>
  );
}
