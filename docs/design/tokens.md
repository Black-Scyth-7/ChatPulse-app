# Design Tokens — ChatPulse (WhatsApp-inspired Dark)

The single source of truth for color, spacing, typography, radius, shadow, and
motion tokens. Every value here maps 1:1 to `tailwind.config.ts`. When a value
changes, change it in both places.

ChatPulse's UI is modeled on **WhatsApp dark mode**: a two-panel messenger with
teal-green outgoing bubbles, a WhatsApp-green accent, and a dark teal chrome.

---

## 1. Color

Dark-first. The chat canvas is the deepest layer (`bg`); chrome (top bars, input
bar) sits one step up (`header`); the conversation list is its own panel
(`panel`). Text uses a 3-step hierarchy. Accent is WhatsApp green.

### 1.1 Background & Surface

| Token             | Tailwind class       | Hex       | Usage                                              |
| ----------------- | -------------------- | --------- | -------------------------------------------------- |
| `bg`              | `bg-bg`              | `#0B141A` | Chat canvas / wallpaper base, deepest layer        |
| `header`          | `bg-header`          | `#1F2C34` | Per-panel top bars, input bar                      |
| `panel`           | `bg-panel`           | `#111B21` | Conversation list / left panel                     |
| `surface`         | `bg-surface`         | `#1F2C34` | Raised surface, incoming bubble, input field       |
| `surface-raised`  | `bg-surface-raised`  | `#233138` | Hovered list rows, secondary surfaces              |
| `surface-overlay` | `bg-surface-overlay` | `#233138` | Modals, popovers, dropdowns                        |
| `surface-inset`   | `bg-surface-inset`   | `#0B141A` | Wells, pressed states                              |

### 1.2 Message bubbles

| Token         | Tailwind class    | Hex       | Usage                             |
| ------------- | ----------------- | --------- | --------------------------------- |
| `bubble-out`  | `bg-bubble-out`   | `#005C4B` | Outgoing message bubble (teal green) |
| `bubble-in`   | `bg-bubble-in`    | `#1F2C34` | Incoming message bubble (dark gray)  |

### 1.3 Border & Divider

| Token           | Tailwind class          | Hex       | Usage                                 |
| --------------- | ----------------------- | --------- | ------------------------------------- |
| `border`        | `border-border`         | `#2A3942` | Default 1px borders, list dividers    |
| `border-strong` | `border-border-strong`  | `#374248` | Emphasized borders, input focus base  |
| `border-subtle` | `border-border-subtle`  | `#1D282F` | Faint separators inside dark surfaces |

### 1.4 Text

| Token            | Tailwind class        | Hex       | Usage                                    |
| ---------------- | --------------------- | --------- | ---------------------------------------- |
| `text`           | `text-text`           | `#E9EDEF` | Primary body & message text              |
| `text-secondary` | `text-text-secondary` | `#8696A0` | Timestamps, previews, metadata, labels   |
| `text-muted`     | `text-text-muted`     | `#667781` | Placeholder, disabled, hints             |
| `text-inverse`   | `text-text-inverse`   | `#0B141A` | Text on accent / light fills             |

Primary text `#E9EDEF` on `bg #0B141A` → contrast ≈ 14.6:1 (WCAG AAA).
Secondary `#8696A0` on `panel #111B21` → ≈ 5.9:1 (WCAG AA for body).
Message text `#E9EDEF` on `bubble-out #005C4B` → ≈ 6.9:1 (WCAG AA).

### 1.5 Accent (WhatsApp green)

| Token           | Tailwind class              | Hex       | Usage                                     |
| --------------- | --------------------------- | --------- | ----------------------------------------- |
| `accent`        | `bg-accent` / `text-accent` | `#00A884` | Primary buttons, FAB, active nav, links   |
| `accent-hover`  | `bg-accent-hover`           | `#02BC96` | Hover state of accent elements            |
| `accent-active` | `bg-accent-active`          | `#008F72` | Pressed state of accent elements          |
| `accent-muted`  | `bg-accent-muted`           | `#103129` | Accent tints: active row bg, mention bg   |
| `accent-fg`     | `text-accent-fg`            | `#0B141A` | Text/icon placed on an accent fill        |

### 1.6 Status

| Token     | Tailwind class | Hex       | Muted bg (`*-muted`) | Usage                       |
| --------- | -------------- | --------- | -------------------- | --------------------------- |
| `success` | `text-success` | `#00A884` | `#103129`            | Online, sent, confirmations |
| `warning` | `text-warning` | `#E6B14C` | `#2A2415`            | Away, caution, rate limits  |
| `danger`  | `text-danger`  | `#F15C6D` | `#2B1619`            | Errors, destructive, DND    |
| `info`    | `text-info`    | `#53BDEB` | `#0F2A33`            | Links, read ticks, tips     |
| `offline` | `text-offline` | `#667781` | —                    | Offline presence            |

### 1.7 Read receipts & badges

| Token         | Tailwind class     | Hex       | Usage                                  |
| ------------- | ------------------ | --------- | -------------------------------------- |
| `tick`        | `text-tick`        | `#8696A0` | Sent / delivered ticks (gray)          |
| `tick-read`   | `text-tick-read`   | `#53BDEB` | Read ticks (blue double-check)         |
| `unread`      | `bg-unread`        | `#00A884` | Unread count badge (green pill)        |

Each status color also has a `-muted` background variant (table above) for
badges and banners, e.g. `bg-danger-muted text-danger`.

---

## 2. Spacing

4px base scale. Tailwind's default numeric spacing is kept; these are the
**named semantic aliases** added on top for the two-panel layout.

| Token        | Tailwind class (e.g. padding) | value | Usage                          |
| ------------ | ----------------------------- | ----- | ------------------------------ |
| `space-1`    | `p-1`                         | 4px   | Tight icon gaps                |
| `space-2`    | `p-2`                         | 8px   | Compact padding, badge padding |
| `space-3`    | `p-3`                         | 12px  | List row vertical rhythm       |
| `space-4`    | `p-4`                         | 16px  | Default panel padding          |
| `space-6`    | `p-6`                         | 24px  | Modal padding, large gaps      |

Custom fixed dimensions (used by layout — see `layout.md`):

| Token        | Tailwind class    | value | Usage                          |
| ------------ | ----------------- | ----- | ------------------------------ |
| `list`       | `w-list`          | 30%   | Conversation list panel width  |
| `chat`       | `w-chat`          | 70%   | Chat view width                |
| `topbar`     | `h-topbar`        | 60px  | Per-panel top bar height       |
| `composer`   | `min-h-composer`  | 42px  | Input bar min height           |
| `avatar-sm`  | `w-avatar-sm`     | 34px  | Inline avatar                  |
| `avatar`     | `w-avatar`        | 40px  | Conversation list row avatar   |
| `avatar-lg`  | `w-avatar-lg`     | 49px  | Chat header avatar             |
| `bubble`     | `max-w-bubble`    | 65%   | Message bubble max width       |

---

## 3. Typography

### 3.1 Font family

WhatsApp uses the platform system font. No web font is loaded.

| Token  | Tailwind class | Stack                                                                         |
| ------ | -------------- | ----------------------------------------------------------------------------- |
| `sans` | `font-sans`    | `Segoe UI, system-ui, -apple-system, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif` |
| `mono` | `font-mono`    | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`                    |

### 3.2 Type scale

Named for the role each size plays in the messenger, matching WhatsApp's spec.

| Token       | Tailwind class  | size / line-height | weight   | Usage                              |
| ----------- | --------------- | ------------------ | -------- | ---------------------------------- |
| `tick`      | `text-tick`     | 11px / 15px        | 400      | Timestamps, tick meta, badges      |
| `preview`   | `text-preview`  | 14px / 20px        | 400      | Chat preview line (truncated)      |
| `message`   | `text-message`  | 14.2px / 1.5       | 400      | Message body (default)             |
| `name`      | `text-name`     | 16px / 21px        | 500      | Contact / channel name             |
| `title`     | `text-title`    | 19px / 25px        | 600      | Headings, modal titles             |

### 3.3 Font weights

| Token      | Tailwind class  | value |
| ---------- | --------------- | ----- |
| `normal`   | `font-normal`   | 400   |
| `medium`   | `font-medium`   | 500   |
| `semibold` | `font-semibold` | 600   |
| `bold`     | `font-bold`     | 700   |

---

## 4. Radius

| Token          | Tailwind class   | value | Usage                              |
| -------------- | ---------------- | ----- | ---------------------------------- |
| `rounded-sm`   | `rounded-sm`     | 4px   | Badges, tags, small chips          |
| `rounded`      | `rounded`        | 6px   | Buttons, inputs, list items        |
| `rounded-bubble` | `rounded-bubble` | 7.5px | Message bubbles                    |
| `rounded-md`   | `rounded-md`     | 8px   | Cards                              |
| `rounded-lg`   | `rounded-lg`     | 12px  | Modals, popovers                   |
| `rounded-full` | `rounded-full`   | 9999  | Avatars, presence dots, FAB, pills |

The tail on a message bubble is the one corner that is **not** rounded (see
`components.md §2`): outgoing squares the top-right, incoming the top-left.

---

## 5. Shadow & Elevation

| Token          | Tailwind class | value                                     | Usage            |
| -------------- | -------------- | ----------------------------------------- | ---------------- |
| `shadow-sm`    | `shadow-sm`    | `0 1px 0.5px rgba(11,20,26,.13)`          | Bubble lift      |
| `shadow`       | `shadow`       | `0 2px 5px rgba(11,20,26,.26)`            | Dropdowns        |
| `shadow-md`    | `shadow-md`    | `0 6px 18px rgba(11,20,26,.4)`            | Popovers         |
| `shadow-lg`    | `shadow-lg`    | `0 17px 50px rgba(11,20,26,.55)`          | Modals / dialogs |
| `shadow-focus` | `shadow-focus` | `0 0 0 2px #0B141A, 0 0 0 4px #00A884`    | Keyboard focus   |

---

## 6. Motion

| Token           | Tailwind class          | value                    | Usage                    |
| --------------- | ----------------------- | ------------------------ | ------------------------ |
| `duration-fast` | `duration-fast` (150ms) | 150ms                    | Hover, color transitions |
| `duration`      | `duration-200`          | 200ms                    | Default UI transitions   |
| `duration-slow` | `duration-slow` (300ms) | 300ms                    | Modal / panel enter-exit |
| `ease-standard` | `ease-standard`         | `cubic-bezier(.2,0,0,1)` | Standard easing          |

---

## 7. Z-index

| Token        | Tailwind class | value | Usage                  |
| ------------ | -------------- | ----- | ---------------------- |
| `z-base`     | `z-base`       | 0     | Content                |
| `z-sticky`   | `z-sticky`     | 10    | Sticky headers         |
| `z-dropdown` | `z-dropdown`   | 30    | Dropdowns              |
| `z-overlay`  | `z-overlay`    | 40    | Modal backdrop         |
| `z-modal`    | `z-modal`      | 50    | Modal panel            |
| `z-toast`    | `z-toast`      | 60    | Toasts / notifications |

---

## 8. Wallpaper

WhatsApp's chat background is `bg` (`#0B141A`) overlaid with a low-opacity
doodle pattern. Implement as a tiled SVG/PNG at ~4% opacity, or a CSS
`background-image` on the message-list container:

```html
<div class="flex-1 bg-bg bg-[url('/chat-wallpaper.png')] bg-repeat">
```

Keep the pattern subtle enough that `#E9EDEF` text and both bubble colors remain
AA-legible over it. If no asset is available, a flat `bg-bg` is an acceptable
fallback.
