# ChatPulse Docs

Specs and documentation for ChatPulse — a real-time team chat app.

## Contents

- `design/tokens.md` — design system tokens (color, spacing, typography, radius, shadow, motion).
- `design/components.md` — component specs (conversation list item, message bubbles, chat header, input bar, avatar, read receipts, …).
- `design/layout.md` — two-panel app shell (conversation list + chat view) and responsive behavior.
- `design/references.md` — WhatsApp dark-mode visual references for each component.

The design system is **WhatsApp-inspired dark mode**.

## Stack

- **Framework:** Next.js (App Router) + TypeScript (strict).
- **Styling:** Tailwind CSS (dark-first design system).
- **Auth:** NextAuth (Auth.js) with the Prisma adapter (GitHub).
- **Database:** PostgreSQL via Prisma.
- **Realtime:** Socket.io (standalone server in `/server`).
- **Validation:** Zod.
- **Markdown:** react-markdown + remark-gfm.

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in real values
pnpm db:generate
pnpm dev               # Next.js on :3000
pnpm dev:socket        # Socket.io server on :3001 (separate terminal)
```
