import Link from "next/link";
import { Github, Linkedin, Youtube, Instagram } from "lucide-react";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "About", href: "/about" },
      { label: "Course Library", href: "/courses" },
      { label: "Events", href: "/events" },
      { label: "Hackathons", href: "/hackathons" },
    ],
  },
  {
    title: "Portal",
    links: [
      { label: "Student Login", href: "/login" },
      { label: "Request Credentials", href: "/request-credentials" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy-dark text-white/80 border-t border-border-dark relative">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,153,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,153,0,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="container-page section-padding !py-14 grid grid-cols-1 md:grid-cols-4 gap-10 relative">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-heading font-bold text-lg text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange shadow-glow">
              <span className="text-navy-dark font-mono text-xs font-bold">SBG</span>
            </span>
            AWS SBG <span className="text-orange">UET Taxila</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            The official portal for AWS SBG UET Taxila — courses, hackathons,
            certificates, and a community of cloud builders.
          </p>
          <div className="mt-5 flex gap-3">
            {[Github, Linkedin, Instagram, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="social link"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 transition-all duration-300 hover:bg-orange hover:border-orange hover:-translate-y-1"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="font-heading font-semibold text-white mb-4 font-mono text-sm uppercase tracking-wider">{col.title}</h4>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/60 hover:text-orange transition-colors duration-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="brand-bar !py-2.5 !text-xs">
        © {new Date().getFullYear()} AWS SBG UET Taxila. Built for students, secured by Supabase RLS.
      </div>
    </footer>
  );
}
