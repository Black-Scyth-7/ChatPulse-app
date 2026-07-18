# Layout Spec — ChatPulse (WhatsApp-inspired)

Defines the app shell: a **two-panel** messenger — conversation list (left) and
chat view (right). There is **no separate sidebar**; the conversation list *is*
the left panel. Each panel has its own top bar (not a shared header). All
dimensions map to tokens in `tokens.md` and `tailwind.config.ts`.

---

## 1. App shell (root)

Full-viewport horizontal split: conversation list (30%) + chat view (70%).

```
┌───────────────────┬──────────────────────────────────────────┐
│ conversation list │  chat view                                │
│   30% (min 300px) │  70% (flex-1)                             │
│  ┌─────────────┐  │  ┌────────────────────────────────────┐  │
│  │ list top bar│  │  │ chat header (avatar · name · ⋮)     │  │
│  ├─────────────┤  │  ├────────────────────────────────────┤  │
│  │ search      │  │  │                                     │  │
│  ├─────────────┤  │  │  message list (wallpaper bg)        │  │
│  │ chat rows   │  │  │                                     │  │
│  │  …          │  │  ├────────────────────────────────────┤  │
│  │             │  │  │ input bar                           │  │
│  └─────────────┘  │  └────────────────────────────────────┘  │
└───────────────────┴──────────────────────────────────────────┘
```

**Root container**

```html
<div class="flex h-screen w-screen overflow-hidden bg-bg text-text font-sans">
```

| Region            | Width           | Classes                                   |
| ----------------- | --------------- | ----------------------------------------- |
| Conversation list | 30% (min 300px) | `w-list min-w-[300px] max-w-[440px] shrink-0` |
| Chat view         | 70% fills rest  | `flex-1 min-w-0` (min-w-0 prevents overflow) |

WhatsApp caps the list width in practice; `min-w-[300px] max-w-[440px]` keeps
rows readable on wide and narrow desktops while honoring the 30% target.

---

## 2. Conversation list panel (left)

Own top bar → search → scrollable list of conversation rows. Background `panel`.

```html
<aside class="w-list min-w-[300px] max-w-[440px] shrink-0 h-full bg-panel
              flex flex-col border-r border-border-subtle">
```

| Section       | Height / behavior | Classes                                                        |
| ------------- | ----------------- | -------------------------------------------------------------- |
| List top bar  | 60px fixed        | `h-topbar shrink-0 flex items-center justify-between px-4 bg-header` |
| Search        | auto              | `shrink-0` — search input (`components.md §9.2`)                |
| Conversations | fills, scrolls    | `flex-1 overflow-y-auto`                                        |

**List top bar** — your own avatar on the left, action icons (new chat, menu)
on the right:

```html
<header class="h-topbar shrink-0 flex items-center justify-between px-4 bg-header">
  <img class="w-avatar h-avatar rounded-full object-cover" alt="You" />
  <div class="flex items-center gap-1 text-text-secondary">
    <button class="p-2 rounded-full hover:bg-surface-raised" aria-label="New chat">✎</button>
    <button class="p-2 rounded-full hover:bg-surface-raised" aria-label="Menu">⋮</button>
  </div>
</header>
```

Conversation row spec lives in `components.md §1`.

---

## 3. Chat view (right)

Vertical stack: chat header → message list (wallpaper) → input bar.

```html
<main class="flex-1 min-w-0 h-full flex flex-col bg-bg">
```

| Region       | Height           | Classes                          |
| ------------ | ---------------- | -------------------------------- |
| Chat header  | 60px fixed       | `components.md §3`               |
| Message list | fills, scrolls   | see §4                           |
| Input bar    | auto (min 42px)  | `components.md §4`               |

**Empty state** (no chat selected) — center a muted illustration + line on the
`bg` canvas; the list panel stays visible.

---

## 4. Message list

Scrollable, wallpaper background, comfortable vertical rhythm. Bubbles align
left/right per sender (`components.md §2`).

```html
<div class="flex-1 overflow-y-auto overflow-x-hidden
            bg-bg bg-[url('/chat-wallpaper.png')] bg-repeat
            py-3 scroll-smooth">
```

| Property                    | Value        | Class                                |
| --------------------------- | ------------ | ------------------------------------ |
| Vertical padding            | 12px         | `py-3`                               |
| Horizontal inset per bubble | 5% each side | `px-[5%]` on each bubble wrapper      |
| Gap between bubbles         | 2px          | `py-0.5` on wrapper                   |
| Gap between groups          | 12px         | `mt-3` on first bubble of a new group |
| Day divider                 | centered pill| `my-3 flex justify-center`           |

**Day divider** (e.g. "TODAY"):

```html
<div class="my-3 flex justify-center">
  <span class="px-3 py-1 rounded-md bg-surface text-tick uppercase
               text-text-secondary shadow-sm">Today</span>
</div>
```

---

## 5. Responsive behavior

WhatsApp mobile shows **either** the conversation list **or** the chat view —
never both. Desktop shows both panels side by side.

| Breakpoint      | Behavior                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------- |
| `< md` (<768px) | Single full-screen view. Default = conversation list (`w-full`); opening a chat swaps to the chat view (`w-full`), chat header shows a back button (`md:hidden`). Only one panel is mounted/visible at a time. |
| `≥ md` (≥768px) | Two-panel split: list `w-list min-w-[300px]` + chat `flex-1`, both always visible.       |

Implementation: drive visibility from an `activeChatId` state.

```html
<!-- mobile: toggle which panel is shown -->
<aside class="w-full md:w-list md:min-w-[300px] md:max-w-[440px] shrink-0
              {{activeChatId ? 'hidden md:flex' : 'flex'}}">…list…</aside>
<main  class="w-full flex-1 min-w-0
              {{activeChatId ? 'flex' : 'hidden md:flex'}}">…chat…</main>
```

- On mobile, the chat header's back button clears `activeChatId` to return to
  the list.
- On desktop, both panels render regardless of `activeChatId`; selecting a row
  only updates the chat view.
