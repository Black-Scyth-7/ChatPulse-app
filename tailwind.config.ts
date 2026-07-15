import type { Config } from "tailwindcss";

/**
 * ChatPulse design system — Tailwind theme extension.
 *
 * Every value here mirrors /docs/design/tokens.md. This file is the machine
 * source of truth; the markdown is the human source of truth. Keep them in sync.
 *
 * Import in JS/TS: `import config from "./tailwind.config";`
 */
const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,html}",
    "./app/**/*.{ts,tsx,js,jsx,html}",
    "./components/**/*.{ts,tsx,js,jsx,html}",
    "./index.html",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Background & surface
        bg: "#0B0D10",
        surface: {
          DEFAULT: "#15181D",
          raised: "#1C2027",
          overlay: "#242932",
          inset: "#0F1216",
        },
        // Borders
        border: {
          DEFAULT: "#262B33",
          strong: "#333A44",
          subtle: "#1B1F25",
        },
        // Text
        text: {
          DEFAULT: "#E6E8EB",
          secondary: "#9BA1A9",
          muted: "#6B7178",
          inverse: "#0B0D10",
        },
        // Accent (brand)
        accent: {
          DEFAULT: "#5B8CFF",
          hover: "#4A7BF0",
          active: "#3A69E0",
          muted: "#1E2A47",
          fg: "#FFFFFF",
        },
        // Status
        success: { DEFAULT: "#3FB950", muted: "#122117" },
        warning: { DEFAULT: "#D29922", muted: "#241C0E" },
        danger: { DEFAULT: "#F85149", muted: "#2B1517" },
        info: { DEFAULT: "#58A6FF", muted: "#0F2033" },
        offline: "#6B7178",
      },
      spacing: {
        "sidebar": "260px",
        "sidebar-rail": "72px",
        "topbar": "56px",
        "composer": "44px",
        "avatar-sm": "24px",
        "avatar": "36px",
        "avatar-lg": "48px",
      },
      width: {
        "sidebar": "260px",
        "sidebar-rail": "72px",
        "avatar-sm": "24px",
        "avatar": "36px",
        "avatar-lg": "48px",
      },
      height: {
        "topbar": "56px",
        "avatar-sm": "24px",
        "avatar": "36px",
        "avatar-lg": "48px",
      },
      minHeight: {
        "composer": "44px",
        "topbar": "56px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["15px", { lineHeight: "22px" }],
        md: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "26px" }],
        xl: ["22px", { lineHeight: "30px" }],
        "2xl": ["28px", { lineHeight: "36px" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,.4)",
        DEFAULT: "0 2px 8px rgba(0,0,0,.45)",
        md: "0 6px 20px rgba(0,0,0,.5)",
        lg: "0 16px 48px rgba(0,0,0,.6)",
        focus: "0 0 0 2px #0B0D10, 0 0 0 4px #5B8CFF",
      },
      transitionDuration: {
        fast: "150ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.2,0,0,1)",
      },
      zIndex: {
        base: "0",
        sticky: "10",
        dropdown: "30",
        overlay: "40",
        modal: "50",
        toast: "60",
      },
    },
  },
  plugins: [],
};

export default config;
