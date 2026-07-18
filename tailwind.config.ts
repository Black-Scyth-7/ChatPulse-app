import type { Config } from "tailwindcss";

/**
 * ChatPulse design system — Tailwind theme extension (WhatsApp-inspired dark).
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
        // Backgrounds & surfaces (WhatsApp dark)
        bg: "#0B141A", // chat/canvas background (wallpaper base)
        header: "#1F2C34", // top bars, input bar
        panel: "#111B21", // conversation list / sidebar panel
        surface: {
          DEFAULT: "#1F2C34", // raised surface, incoming bubble, input field
          raised: "#233138", // hovered rows, secondary surfaces
          overlay: "#233138", // modals, popovers, dropdowns
          inset: "#0B141A", // wells, pressed states
        },
        // Message bubbles
        bubble: {
          out: "#005C4B", // outgoing (teal green)
          in: "#1F2C34", // incoming (dark gray)
        },
        // Borders & dividers
        border: {
          DEFAULT: "#2A3942",
          strong: "#374248",
          subtle: "#1D282F",
        },
        // Text
        text: {
          DEFAULT: "#E9EDEF", // primary
          secondary: "#8696A0", // timestamps, previews, meta
          muted: "#667781", // placeholder, disabled
          inverse: "#0B141A", // text on accent fills
        },
        // Accent (WhatsApp green)
        accent: {
          DEFAULT: "#00A884",
          hover: "#02BC96",
          active: "#008F72",
          muted: "#103129", // green tint: active row, mention bg
          fg: "#0B141A", // text/icon on an accent fill
        },
        // Status
        success: { DEFAULT: "#00A884", muted: "#103129" }, // online, sent
        warning: { DEFAULT: "#E6B14C", muted: "#2A2415" },
        danger: { DEFAULT: "#F15C6D", muted: "#2B1619" },
        info: { DEFAULT: "#53BDEB", muted: "#0F2A33" }, // link blue / read ticks
        offline: "#667781",
        // Read receipts (double-tick)
        tick: {
          DEFAULT: "#8696A0", // sent / delivered (gray)
          read: "#53BDEB", // read (blue)
        },
        // Unread badge
        unread: "#00A884",
      },
      spacing: {
        list: "30%", // conversation list panel width (desktop)
        chat: "70%", // chat view width (desktop)
        topbar: "60px", // per-panel top bar height
        composer: "42px", // input bar min height
        "avatar-sm": "34px", // inline / list-row small
        avatar: "40px", // list row avatar
        "avatar-lg": "49px", // chat header avatar
      },
      width: {
        list: "30%",
        chat: "70%",
        "avatar-sm": "34px",
        avatar: "40px",
        "avatar-lg": "49px",
      },
      height: {
        topbar: "60px",
        "avatar-sm": "34px",
        avatar: "40px",
        "avatar-lg": "49px",
      },
      minHeight: {
        composer: "42px",
        topbar: "60px",
      },
      maxWidth: {
        bubble: "65%", // message bubble max width
      },
      fontFamily: {
        // System font stack — matches WhatsApp Web
        sans: [
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Roboto",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        tick: ["11px", { lineHeight: "15px" }], // timestamps, ticks
        preview: ["14px", { lineHeight: "20px" }], // chat preview line
        message: ["14.2px", { lineHeight: "1.5" }], // message body
        name: ["16px", { lineHeight: "21px" }], // contact / channel name
        title: ["19px", { lineHeight: "25px" }], // headings, modal titles
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        bubble: "7.5px", // WhatsApp bubble radius
        lg: "12px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 0.5px rgba(11,20,26,.13)", // bubble lift
        DEFAULT: "0 2px 5px rgba(11,20,26,.26)", // dropdowns
        md: "0 6px 18px rgba(11,20,26,.4)", // popovers
        lg: "0 17px 50px rgba(11,20,26,.55)", // modals
        focus: "0 0 0 2px #0B141A, 0 0 0 4px #00A884",
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
