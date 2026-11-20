"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Cpu, Braces, Cloud, Database, Sparkles } from "lucide-react";
import { useData } from "@/context/DataContext";
import { GridBackground } from "./GridBackground";

export function Hero() {
  const { siteSettings } = useData();
  const subtitle = siteSettings.platformName?.trim()
    || (siteSettings.universityName
      ? `AWS SBG ${siteSettings.universityName}`
      : "AWS SBG UET Taxila");

  return (
    <GridBackground className="pt-36 pb-8 md:pt-44 md:pb-12" minHeight="90vh">
      <div className="container-page relative grid min-h-[70vh] items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy border border-orange/30 shadow-glow">
              <Cpu className="h-6 w-6 text-orange" />
            </span>
            <span className="inline-block rounded-full bg-orange/10 px-4 py-1.5 text-xs font-mono font-semibold text-orange border border-orange/20">
              {subtitle}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] font-heading">
            {siteSettings.heroTitle}
          </h1>
          <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-2xl font-body">
            {siteSettings.heroDescription}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/request-credentials" className="btn-primary">
              Request Credentials <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/courses" className="btn-ghost">
              <PlayCircle className="h-4 w-4" /> Course Library
            </Link>
            <Link href="/hackathons" className="btn-ghost border-orange/40 text-orange hover:bg-orange/10">
              Hackathons
            </Link>
          </div>

        </motion.div>

        <div className="relative mx-auto hidden h-[390px] w-[390px] lg:block" aria-hidden>
          <div className="hero-orbit hero-orbit-outer">
            <span className="hero-node left-1/2 top-0 -translate-x-1/2"><Cloud /></span>
            <span className="hero-node bottom-8 right-0"><Database /></span>
            <span className="hero-node bottom-8 left-0"><Braces /></span>
          </div>
          <div className="hero-orbit hero-orbit-inner">
            <span className="hero-node left-1/2 top-0 -translate-x-1/2"><Sparkles /></span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="hero-core">
              <span className="text-xs font-mono text-orange">BUILD</span>
              <strong className="text-3xl text-white">AWS</strong>
              <span className="text-xs font-mono text-white/45">LEARN · SHIP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="brand-bar mt-8 font-mono">
        {subtitle} — Learn. Build. Innovate on AWS Cloud
      </div>
    </GridBackground>
  );
}
