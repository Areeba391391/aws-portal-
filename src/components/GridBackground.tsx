"use client";

import { ReactNode } from "react";

interface GridBackgroundProps {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  minHeight?: string;
}

/** AWS SBG blueprint grid background — matches brand style guide */
export function GridBackground({ children, className = "", accent = true, minHeight }: GridBackgroundProps) {
  return (
    <div
      className={`grid-bg grid-accent-blocks relative overflow-hidden ${className}`}
      style={minHeight ? { minHeight } : undefined}
    >
      {accent && (
        <>
          <div className="absolute top-[18%] left-[6%] w-8 h-8 bg-orange/80 hidden sm:block" aria-hidden />
          <div className="absolute top-[45%] right-[12%] w-6 h-6 bg-orange/60 hidden md:block" aria-hidden />
          <div className="absolute bottom-[25%] left-[15%] w-10 h-10 bg-orange/40 hidden lg:block" aria-hidden />
          <div className="absolute top-[30%] right-[25%] w-4 h-4 bg-orange hidden md:block animate-pulse-orange" aria-hidden />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
