"use client";

import { motion } from "framer-motion";

export function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
  light = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
  light?: boolean;
}) {
  const titleClass = light ? "text-white" : "text-heading-light dark:text-heading-dark";
  const descClass = light ? "text-white/60" : "text-paragraph-light dark:text-paragraph-dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && (
        <span className="inline-block text-xs font-mono font-semibold tracking-widest uppercase text-orange mb-3">
          {eyebrow}
        </span>
      )}
      <h2 className={`text-3xl md:text-4xl font-bold font-heading ${titleClass}`}>{title}</h2>
      {description && <p className={`mt-4 leading-relaxed ${descClass}`}>{description}</p>}
    </motion.div>
  );
}
