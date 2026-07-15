# Design Tokens — ChatPulse (Dark Theme)

The single source of truth for color, spacing, typography, radius, shadow, and
motion tokens. Every value here maps 1:1 to `tailwind.config.ts`. When a value
changes, change it in both places.

---

## 1. Color

ChatPulse is dark-first. Backgrounds go from deepest (`bg`) to most raised
(`surface-overlay`). Text uses a 3-step hierarchy. Accent is a calm indigo-blue.

### 1.1 Background & Surface

| Token                   | Tailwind class            | Hex       | Usage                                            |
| ----------------------- | ------------------------- | --------- | ------------------------------------------------ |
| `bg`                    | `bg-bg`                   | `#0B0D10` | App canvas, deepest layer, behind everything     |
| `surface`               | `bg-surface`              | `#15181D` | Sidebar, panels, cards                           |
| `surface-raised`        | `bg-surface-raised`       | `#1C2027` | Hovered rows, input fields, secondary buttons    |
| `surface-overlay`       | `bg-surface-overlay`      | `#242932` | Modals, popovers, dropdowns, tooltips            |
| `surface-inset`         | `bg-surface-inset`        | `#0F1216` | Code blocks, wells, pressed states               |

### 1.2 Border & Divider

| Token          | Tailwind class     | Hex       | Usage                                    |
| -------------- | ------------------ | --------- | ---------------------------------------- |
| `border`       | `border-border`    | `#262B33` | Default 1px borders, dividers            |
| `border-strong`| `border-border-strong` | `#333A44` | Emphasized borders, input focus ring base|
| `border-subtle`| `border-border-subtle` | `#1B1F25` | Faint separators inside dark surfaces    |

### 1.3 Text

| Token            | Tailwind class        | Hex       | Usage                                   |
| ---------------- | --------------------- | --------- | --------------------------------------- |
| `text`           | `text-text`           | `#E6E8EB` | Primary body & message text             |
| `text-secondary` | `text-text-secondary` | `#9BA1A9` | Timestamps, metadata, labels            |
| `text-muted`     | `text-text-muted`     | `#6B7178` | Placeholder, disabled, hints            |
| `text-inverse`   | `text-text-inverse`   | `#0B0D10` | Text on accent / light fills            |

Primary text `#E6E8EB` on `bg #0B0D10` → contrast ≈ 14.8:1 (WCAG AAA).
Secondary `#9BA1A9` on `surface #15181D` → ≈ 6.9:1 (WCAG AA for body).

### 1.4 Accent (Brand)

| Token           | Tailwind class       | Hex       | Usage                                    |
| --------------- | -------------------- | --------- | ---------------------------------------- |
| `accent`        | `bg-accent` / `text-accent` | `#5B8CFF` | Primary buttons, links, active nav, focus|
| `accent-hover`  | `bg-accent-hover`    | `#4A7BF0` | Hover state of accent elements           |
| `accent-active` | `bg-accent-active`   | `#3A69E0` | Pressed state of accent elements         |
| `accent-muted`  | `bg-accent-muted`    | `#1E2A47` | Accent tints: active row bg, mention bg  |
| `accent-fg`     | `text-accent-fg`     | `#FFFFFF` | Text/icon placed on an accent fill       |

### 1.5 Status

| Token       | Tailwind class    | Hex       | Muted bg (`*-muted`) | Usage                       |
| ----------- | ----------------- | --------- | -------------------- | --------------------------- |
| `success`   | `text-success`    | `#3FB950` | `#122117`            | Online, sent, confirmations |
| `warning`   | `text-warning`    | `#D29922` | `#241C0E`            | Away, caution, rate limits  |
| `danger`    | `text-danger`     | `#F85149` | `#2B1517`            | Errors, destructive, DND    |
| `info`      | `text-info`       | `#58A6FF` | `#0F2033`            | Neutral notices, tips       |
| `offline`   | `text-offline`    | `#6B7178` | —                    | Offline presence dot        |

Each status color also has a `-muted` background variant (table above) for
badges and banners, e.g. `bg-danger-muted text-danger`.

---

## 2. Spacing

4px base scale. Tailwind's default numeric spacing is kept; these are the
**named semantic aliases** added on top for layout consistency.

| Token          | Tailwind class (e.g. padding) | px    | Usage                             |
| -------------- | ----------------------------- | ----- | --------------------------------- |
| `space-0`      | `p-0`                         | 0     | Reset                             |
| `space-1`      | `p-1`                         | 4     | Tight icon gaps                   |
| `space-2`      | `p-2`                         | 8     | Compact padding, badge padding    |
| `space-3`      | `p-3`                         | 12    | Message row vertical rhythm       |
| `space-4`      | `p-4`                         | 16    | Default panel / input padding     |
| `space-5`      | `p-5`                         | 20    | Section padding                   |
| `space-6`      | `p-6`                         | 24    | Modal padding, large gaps         |
| `space-8`      | `p-8`                         | 32    | Empty-state padding               |
| `space-10`     | `p-10`                        | 40    | Extra-large layout gaps           |

Custom fixed dimensions (used by layout — see `layout.md`):

| Token             | Tailwind class     | px  | Usage                        |
| ----------------- | ------------------ | --- | ---------------------------- |
| `sidebar`         | `w-sidebar`        | 260 | Channel sidebar width        |
| `sidebar-rail`    | `w-sidebar-rail`   | 72  | Workspace icon rail width    |
| `topbar`          | `h-topbar`         | 56  | Channel header height        |
| `composer-min`    | `min-h-composer`   | 44  | Message input min height     |
| `avatar-sm`       | `w-avatar-sm`      | 24  | Inline avatar                |
| `avatar`          | `w-avatar`         | 36  | Message list avatar          |
| `avatar-lg`       | `w-avatar-lg`      | 48  | Profile / DM header avatar   |

---

## 3. Typography

### 3.1 Font families

| Token         | Tailwind class | Stack                                                              |
| ------------- | -------------- | ----------------------------------------------------------------- |
| `sans`        | `font-sans`    | `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif` |
| `mono`        | `font-mono`    | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` |

### 3.2 Type scale

| Token        | Tailwind class | size / line-height | weight              | Usage                     |
| ------------ | -------------- | ------------------ | ------------------- | ------------------------- |
| `xs`         | `text-xs`      | 12 / 16            | 400/500             | Timestamps, badges, meta  |
| `sm`         | `text-sm`      | 13 / 20            | 400/500             | Secondary UI, labels      |
| `base`       | `text-base`    | 15 / 22            | 400                 | Message body (default)    |
| `md`         | `text-md`      | 16 / 24            | 500                 | Input text, buttons       |
| `lg`         | `text-lg`      | 18 / 26            | 600                 | Channel title             |
| `xl`         | `text-xl`      | 22 / 30            | 700                 | Modal titles              |
| `2xl`        | `text-2xl`     | 28 / 36            | 700                 | Page / empty-state titles |

### 3.3 Font weights

| Token       | Tailwind class   | value |
| ----------- | ---------------- | ----- |
| `normal`    | `font-normal`    | 400   |
| `medium`    | `font-medium`    | 500   |
| `semibold`  | `font-semibold`  | 600   |
| `bold`      | `font-bold`      | 700   |

---

## 4. Radius

| Token        | Tailwind class  | px   | Usage                          |
| ------------ | --------------- | ---- | ------------------------------ |
| `rounded-sm` | `rounded-sm`    | 4    | Badges, tags, small chips      |
| `rounded`    | `rounded`       | 6    | Buttons, inputs, list items    |
| `rounded-md` | `rounded-md`    | 8    | Message bubbles, cards         |
| `rounded-lg` | `rounded-lg`    | 12   | Modals, popovers               |
| `rounded-xl` | `rounded-xl`    | 16   | Large containers               |
| `rounded-full`| `rounded-full` | 9999 | Avatars, presence dots, pills  |

---

## 5. Shadow & Elevation

| Token          | Tailwind class   | value                                             | Usage             |
| -------------- | ---------------- | ------------------------------------------------- | ----------------- |
| `shadow-sm`    | `shadow-sm`      | `0 1px 2px rgba(0,0,0,.4)`                         | Raised rows       |
| `shadow`       | `shadow`         | `0 2px 8px rgba(0,0,0,.45)`                        | Dropdowns         |
| `shadow-md`    | `shadow-md`      | `0 6px 20px rgba(0,0,0,.5)`                        | Popovers          |
| `shadow-lg`    | `shadow-lg`      | `0 16px 48px rgba(0,0,0,.6)`                       | Modals / dialogs  |
| `shadow-focus` | `shadow-focus`   | `0 0 0 2px #0B0D10, 0 0 0 4px #5B8CFF`             | Keyboard focus    |

---

## 6. Motion

| Token          | Tailwind class          | value    | Usage                    |
| -------------- | ----------------------- | -------- | ------------------------ |
| `duration-fast`| `duration-fast` (150ms) | 150ms    | Hover, color transitions |
| `duration`     | `duration-200`          | 200ms    | Default UI transitions   |
| `duration-slow`| `duration-slow` (300ms) | 300ms    | Modal / panel enter-exit |
| `ease-standard`| `ease-standard`         | `cubic-bezier(.2,0,0,1)` | Standard easing |

---

## 7. Z-index

| Token         | Tailwind class | value | Usage              |
| ------------- | -------------- | ----- | ------------------ |
| `z-base`      | `z-base`       | 0     | Content            |
| `z-sticky`    | `z-sticky`     | 10    | Sticky headers     |
| `z-dropdown`  | `z-dropdown`   | 30    | Dropdowns          |
| `z-overlay`   | `z-overlay`    | 40    | Modal backdrop     |
| `z-modal`     | `z-modal`      | 50    | Modal panel        |
| `z-toast`     | `z-toast`      | 60    | Toasts / notifications |
