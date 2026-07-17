# ChatPulse Docs

Specs and documentation for ChatPulse — a real-time team chat app.

## Contents

- `design/tokens.md` — design system tokens (color, spacing, typography, radius, shadow, motion).

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
