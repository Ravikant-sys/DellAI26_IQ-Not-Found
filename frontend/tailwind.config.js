/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens
        bg:        "#060810",
        surface:   "#0d1117",
        "surface-2": "#131922",
        // Accents
        indigo:  "#6366f1",
        sky:     "#38bdf8",
        emerald: "#10b981",
        amber:   "#f59e0b",
        rose:    "#f43f5e",
        violet:  "#8b5cf6",
        // Legacy compat
        background:     "#060810",
        panel:          "#0d1117",
        ink:            "#e8edf4",
        inkMuted:       "#6b7a8d",
        accentSky:      "#38bdf8",
        accentEmerald:  "#10b981",
        accentRose:     "#f43f5e",
        accentAmber:    "#f59e0b",
      },
      fontFamily: {
        inter:   ["var(--font-inter)",  "Inter", "system-ui", "sans-serif"],
        outfit:  ["var(--font-outfit)", "Outfit", "sans-serif"],
        mono:    ["var(--font-mono)",   "JetBrains Mono", "monospace"],
        // Legacy
        sans:    ["var(--font-inter)",  "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      animation: {
        "fade-up":    "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in":    "fade-in 0.3s ease both",
        "scale-in":   "scale-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "shimmer":    "shimmer 4s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        "fade-up":  { from: { opacity: 0, transform: "translateY(14px)" }, to: { opacity: 1, transform: "none" } },
        "fade-in":  { from: { opacity: 0 }, to: { opacity: 1 } },
        "scale-in": { from: { opacity: 0, transform: "scale(0.96)" }, to: { opacity: 1, transform: "scale(1)" } },
        "shimmer":  { from: { backgroundPosition: "-200% center" }, to: { backgroundPosition: "200% center" } },
      },
    },
  },
  plugins: [],
};
