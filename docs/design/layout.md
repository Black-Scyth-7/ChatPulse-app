# Layout Spec — ChatPulse

Defines the app shell: workspace rail, channel sidebar, main content area,
message list, channel header, and the message composer. All dimensions map to
tokens in `tokens.md` and `tailwind.config.ts`. Exact Tailwind classes are given
for every region.

---

## 1. App shell (root grid)

Full-viewport horizontal layout: fixed rail → fixed sidebar → fluid main.

```
┌──────┬─────────────┬──────────────────────────────────────┐
│ rail │  sidebar    │  main                                 │
│ 72px │   260px     │  flex-1 (fills remaining width)       │
└──────┴─────────────┴──────────────────────────────────────┘
```

**Root container**

```html
<div class="flex h-screen w-screen overflow-hidden bg-bg text-text font-sans">
```

| Region  | Width               | Classes                                    |
| ------- | ------------------- | ------------------------------------------ |
| Rail    | 72px fixed          | `w-sidebar-rail shrink-0`                  |
| Sidebar | 260px fixed         | `w-sidebar shrink-0`                        |
| Main    | fills remaining     | `flex-1 min-w-0` (min-w-0 prevents overflow)|

---

## 2. Workspace rail (far left)

Vertical column of workspace icons + add button.

```html
<nav class="w-sidebar-rail shrink-0 h-full bg-bg
            flex flex-col items-center gap-2 py-3
            border-r border-border-subtle">
```

- Icon buttons: `w-12 h-12 rounded-lg` (active: `rounded-md ring-2 ring-accent`)
- Vertical gap between icons: `gap-2` (8px)
- Vertical padding: `py-3` (12px)

---

## 3. Channel sidebar

Fixed 260px column: workspace header, scrollable channel list, user footer.

```html
<aside class="w-sidebar shrink-0 h-full bg-surface
              flex flex-col border-r border-border">
```

| Section          | Height / behavior      | Classes                                              |
| ---------------- | ---------------------- | ---------------------------------------------------- |
| Workspace header | 56px fixed             | `h-topbar shrink-0 flex items-center px-4 font-semibold text-md border-b border-border` |
| Channel list     | fills, scrolls         | `flex-1 overflow-y-auto py-2 px-2 space-y-0.5`       |
| Section label    | —                      | `px-2 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-text-muted` |
| User footer      | 56px fixed             | `h-topbar shrink-0 flex items-center gap-2 px-3 border-t border-border` |

Channel list item spec lives in `components.md §3`.

---

## 4. Main content area

Vertical stack: channel header → message list → composer.

```html
<main class="flex-1 min-w-0 h-full flex flex-col bg-bg">
```

| Region         | Height              | Classes                              |
| -------------- | ------------------- | ------------------------------------ |
| Channel header | 56px fixed          | see §5                               |
| Message list   | fills, scrolls      | see §6                               |
| Composer       | auto (min 44px)     | see §7                               |

---

## 5. Channel header (top bar)

```html
<header class="h-topbar shrink-0 flex items-center justify-between
               px-4 border-b border-border bg-bg z-sticky">
  <div class="flex items-center gap-2 min-w-0">
    <span class="text-text-muted">#</span>
    <h1 class="text-lg font-semibold truncate">general</h1>
  </div>
  <div class="flex items-center gap-1"><!-- actions --></div>
</header>
```

- Height: `h-topbar` (56px)
- Horizontal padding: `px-4` (16px)
- Title: `text-lg font-semibold truncate`
- Divider: `border-b border-border`

---

## 6. Message list

Scrollable, reverse-flow feel with comfortable vertical rhythm.

```html
<div class="flex-1 overflow-y-auto overflow-x-hidden
            px-4 py-4 space-y-1 scroll-smooth">
```

| Property                  | Value            | Class            |
| ------------------------- | ---------------- | ---------------- |
| Horizontal padding        | 16px             | `px-4`           |
| Vertical padding          | 16px             | `py-4`           |
| Gap between message rows  | 4px              | `space-y-1`      |
| Gap between message groups| 16px             | `mt-4` on new group |
| Day divider               | centered pill    | `my-4 flex items-center gap-3` |

**Message row** (grouped — avatar + content): full spec in `components.md §1`.
Content column is width-constrained for readability:

```html
<div class="max-w-[720px]">  <!-- message text column cap -->
```

---

## 7. Message composer (input area)

Anchored bottom, grows with content up to a cap.

```html
<div class="shrink-0 px-4 pb-4 pt-1 bg-bg">
  <div class="flex items-end gap-2 rounded-md border border-border-strong
              bg-surface-raised px-3 py-2
              focus-within:border-accent focus-within:shadow-focus
              transition-colors duration-fast">
    <button class="p-2 rounded text-text-secondary hover:text-text hover:bg-surface-overlay"><!-- attach --></button>
    <textarea
      class="flex-1 min-h-composer max-h-[200px] resize-none bg-transparent
             text-md text-text placeholder:text-text-muted
             focus:outline-none py-2"
      placeholder="Message #general"></textarea>
    <button class="p-2 rounded bg-accent text-accent-fg hover:bg-accent-hover
                   disabled:bg-surface-overlay disabled:text-text-muted"><!-- send --></button>
  </div>
  <p class="mt-1 px-1 text-xs text-text-muted">Enter to send · Shift+Enter for newline</p>
</div>
```

| Property               | Value                | Class                    |
| ---------------------- | -------------------- | ------------------------ |
| Outer padding          | 16px sides, 16px btm | `px-4 pb-4 pt-1`         |
| Field min height       | 44px                 | `min-h-composer`         |
| Field max height       | 200px then scroll    | `max-h-[200px]`          |
| Field padding          | 12px x / 8px y        | `px-3 py-2`              |
| Field radius           | 8px                  | `rounded-md`             |
| Focus ring             | accent               | `focus-within:shadow-focus focus-within:border-accent` |

---

## 8. Responsive behavior

| Breakpoint         | Behavior                                                       |
| ------------------ | ------------------------------------------------------------- |
| `< md` (<768px)    | Sidebar collapses to overlay drawer: `fixed inset-y-0 left-0 z-modal` toggled; main is full width. Rail hidden behind hamburger. |
| `md` (≥768px)      | Rail hidden, sidebar visible: `hidden md:flex` on sidebar.     |
| `lg` (≥1024px)     | Full three-column shell (rail + sidebar + main) visible.       |

Root grid stays `flex`; use `hidden lg:flex` on the rail and `hidden md:flex` on
the sidebar to progressively reveal columns.
