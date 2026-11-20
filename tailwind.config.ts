import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#232F3E",
          light: "#2E3D50",
          dark: "#161E2D",
        },
        orange: {
          DEFAULT: "#FF9900",
          hover: "#E88700",
          glow: "#FF990033",
        },
        skyblue: {
          DEFAULT: "#146EB4",
        },
        bg: {
          light: "#F8FAFC",
          dark: "#0B1220",
        },
        card: {
          light: "#FFFFFF",
          dark: "#151E2D",
        },
        border: {
          light: "#E5E7EB",
          dark: "#243248",
        },
        heading: {
          light: "#111827",
          dark: "#F3F4F6",
        },
        paragraph: {
          light: "#6B7280",
          dark: "#9CA3AF",
        },
        grid: {
          line: "#243248",
          accent: "#FF9900",
        },
      },
      fontFamily: {
        heading: ["var(--font-jetbrains)", "var(--font-poppins)", "monospace"],
        body: ["var(--font-inter)", "sans-serif"],
        numbers: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(15, 23, 42, 0.06)",
        "card-dark": "0 2px 14px rgba(0, 0, 0, 0.35)",
        lift: "0 20px 35px -10px rgba(255, 153, 0, 0.25)",
        glow: "0 0 40px rgba(255, 153, 0, 0.15)",
        "grid-glow": "inset 0 0 80px rgba(255, 153, 0, 0.04)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-orange": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up 0.7s ease forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-orange": "pulse-orange 3s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-orange": "linear-gradient(135deg, #FF9900 0%, #E88700 100%)",
        "gradient-navy": "linear-gradient(135deg, #161E2D 0%, #232F3E 50%, #146EB4 100%)",
        "grid-pattern":
          "linear-gradient(rgba(255,153,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,153,0,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  plugins: [],
};
export default config;
