# Component Specs — ChatPulse

Exact Tailwind classes for every core component. All values reference tokens in
`tokens.md` / `tailwind.config.ts`. States (hover / focus / active / disabled)
are listed where applicable.

---

## 1. Message bubble & row

ChatPulse uses **flat rows** (Slack-style), not opaque colored bubbles, for
readability in a dense list — with an accent-tinted variant for the current
user's own messages and mentions.

### 1.1 Message row (grouped: avatar + content)

```html
<div class="group flex items-start gap-3 px-2 py-1 -mx-2 rounded-md
            hover:bg-surface-raised transition-colors duration-fast">
  <!-- avatar: components §2 -->
  <img class="w-avatar h-avatar rounded-full shrink-0 mt-0.5" />
  <div class="min-w-0 flex-1">
    <div class="flex items-baseline gap-2">
      <span class="text-sm font-semibold text-text">Ada Lovelace</span>
      <span class="text-xs text-text-secondary">9:41 AM</span>
    </div>
    <div class="text-base text-text leading-relaxed break-words">
      Message content goes here.
    </div>
  </div>
</div>
```

| Element     | Classes                                                        |
| ----------- | ------------------------------------------------------------- |
| Row         | `flex items-start gap-3 px-2 py-1 -mx-2 rounded-md hover:bg-surface-raised` |
| Author name | `text-sm font-semibold text-text`                             |
| Timestamp   | `text-xs text-text-secondary`                                 |
| Body        | `text-base text-text leading-relaxed break-words`             |

### 1.2 Continuation row (same author, no avatar)

```html
<div class="group flex items-start gap-3 px-2 py-0.5 -mx-2 rounded-md hover:bg-surface-raised">
  <span class="w-avatar shrink-0 text-[10px] text-text-muted opacity-0 group-hover:opacity-100 text-right pr-1 mt-1">9:42</span>
  <div class="min-w-0 flex-1 text-base text-text leading-relaxed break-words">…</div>
</div>
```

### 1.3 Own-message / mention variant

```html
<!-- own message: subtle accent tint -->
<div class="… bg-accent-muted/40 hover:bg-accent-muted/60">
<!-- row containing an @-mention to current user -->
<div class="… bg-warning-muted border-l-2 border-warning">
```

### 1.4 Bubble variant (compact / DM)

For 1:1 DMs a rounded bubble is available:

```html
<div class="max-w-[75%] rounded-md px-3 py-2 text-base
            bg-surface-raised text-text">              <!-- incoming -->
<div class="max-w-[75%] rounded-md px-3 py-2 text-base
            bg-accent text-accent-fg ml-auto">          <!-- outgoing -->
```

---

## 2. User avatar

Circular image with optional presence dot. Three sizes.

| Size  | Dimension | Classes                          |
| ----- | --------- | -------------------------------- |
| sm    | 24px      | `w-avatar-sm h-avatar-sm rounded-full` |
| md    | 36px      | `w-avatar h-avatar rounded-full` |
| lg    | 48px      | `w-avatar-lg h-avatar-lg rounded-full` |

```html
<div class="relative shrink-0">
  <img src="…" alt="Ada" class="w-avatar h-avatar rounded-full object-cover bg-surface-raised" />
  <!-- presence dot -->
  <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
               ring-2 ring-surface bg-success"></span>
</div>
```

**Presence dot color by status:**

| Status  | Class            |
| ------- | ---------------- |
| Online  | `bg-success`     |
| Away    | `bg-warning`     |
| DND     | `bg-danger`      |
| Offline | `bg-offline`     |

**Fallback (initials):**

```html
<div class="w-avatar h-avatar rounded-full bg-accent-muted text-accent
            flex items-center justify-center text-sm font-semibold">AL</div>
```

---

## 3. Channel list item

Row in the sidebar channel list. Default / hover / active / unread states.

```html
<!-- default -->
<a class="flex items-center gap-2 px-2 h-8 rounded text-sm
          text-text-secondary hover:bg-surface-raised hover:text-text
          transition-colors duration-fast">
  <span class="text-text-muted">#</span>
  <span class="truncate flex-1">general</span>
</a>
```

**States**

| State           | Classes to apply                                                        |
| --------------- | ----------------------------------------------------------------------- |
| Default         | `text-text-secondary`                                                    |
| Hover           | `hover:bg-surface-raised hover:text-text`                                |
| Active/selected | `bg-accent-muted text-text font-medium` (prefix `text-accent`)          |
| Unread          | `text-text font-semibold` + unread badge (see §7)                        |
| Muted channel   | `text-text-muted opacity-70`                                            |

**Active + unread example:**

```html
<a class="flex items-center gap-2 px-2 h-8 rounded text-sm
          bg-accent-muted text-text font-medium">
  <span class="text-accent">#</span>
  <span class="truncate flex-1">design-system</span>
  <span class="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-danger text-accent-fg
               text-xs font-semibold flex items-center justify-center">3</span>
</a>
```

Row height `h-8` (32px), padding `px-2`, radius `rounded` (6px).

---

## 4. Modal / dialog

Backdrop + centered overlay panel.

```html
<!-- backdrop -->
<div class="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm
            transition-opacity duration-slow"></div>

<!-- panel -->
<div role="dialog" aria-modal="true"
     class="fixed left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2
            w-full max-w-md rounded-lg bg-surface-overlay
            border border-border shadow-lg
            transition-all duration-slow ease-standard">
  <header class="flex items-center justify-between px-6 pt-6 pb-4">
    <h2 class="text-xl font-bold text-text">Create channel</h2>
    <button class="p-1.5 rounded text-text-secondary hover:text-text hover:bg-surface-raised" aria-label="Close">✕</button>
  </header>
  <div class="px-6 pb-2 text-base text-text-secondary"><!-- body --></div>
  <footer class="flex justify-end gap-2 px-6 py-4 border-t border-border">
    <!-- buttons: §5 -->
  </footer>
</div>
```

| Element  | Classes                                                       |
| -------- | ------------------------------------------------------------- |
| Backdrop | `fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm`        |
| Panel    | `z-modal max-w-md rounded-lg bg-surface-overlay border border-border shadow-lg` |
| Padding  | `px-6` (24px) horizontal; header `pt-6 pb-4`, footer `py-4`   |
| Title    | `text-xl font-bold text-text`                                |
| Footer   | `flex justify-end gap-2 border-t border-border`              |

Sizes: `max-w-sm` (small), `max-w-md` (default), `max-w-lg` (large), `max-w-2xl` (wide).

---

## 5. Button variants

Base (shared) classes:

```
inline-flex items-center justify-center gap-2 rounded font-medium
text-md h-10 px-4 transition-colors duration-fast
focus:outline-none focus-visible:shadow-focus
disabled:opacity-50 disabled:pointer-events-none
```

| Variant     | Classes (append to base)                                                     |
| ----------- | --------------------------------------------------------------------------- |
| Primary     | `bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active`     |
| Secondary   | `bg-surface-raised text-text hover:bg-surface-overlay border border-border` |
| Ghost       | `bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text`|
| Danger      | `bg-danger text-accent-fg hover:brightness-110 active:brightness-95`         |
| Danger-soft | `bg-danger-muted text-danger hover:bg-danger/20`                             |
| Link        | `bg-transparent text-accent hover:underline h-auto px-0`                     |

**Sizes**

| Size | Classes            |
| ---- | ------------------ |
| sm   | `h-8 px-3 text-sm` |
| md   | `h-10 px-4 text-md` (default) |
| lg   | `h-12 px-6 text-md` |
| icon | `h-10 w-10 p-0` (square) |

```html
<button class="inline-flex items-center justify-center gap-2 rounded font-medium
               text-md h-10 px-4 transition-colors duration-fast
               focus:outline-none focus-visible:shadow-focus
               disabled:opacity-50 disabled:pointer-events-none
               bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active">
  Send invite
</button>
```

---

## 6. Input fields

### 6.1 Text input

```html
<label class="block">
  <span class="block mb-1 text-sm font-medium text-text-secondary">Channel name</span>
  <input type="text" placeholder="e.g. marketing"
    class="w-full h-10 px-3 rounded bg-surface-inset text-md text-text
           placeholder:text-text-muted border border-border-strong
           focus:outline-none focus:border-accent focus:shadow-focus
           transition-colors duration-fast" />
</label>
```

| Element      | Classes                                                       |
| ------------ | ------------------------------------------------------------- |
| Label        | `text-sm font-medium text-text-secondary mb-1`               |
| Input        | `h-10 px-3 rounded bg-surface-inset border border-border-strong` |
| Placeholder  | `placeholder:text-text-muted`                                |
| Focus        | `focus:border-accent focus:shadow-focus`                     |
| Error        | `border-danger focus:border-danger` + help text `text-danger`|
| Disabled     | `disabled:opacity-50 disabled:cursor-not-allowed`            |
| Help / error | `mt-1 text-xs text-text-muted` (error: `text-danger`)        |

### 6.2 Textarea

Same as text input plus: `min-h-[80px] py-2 resize-y leading-relaxed`.

### 6.3 Search input

```html
<div class="relative">
  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">⌕</span>
  <input class="w-full h-9 pl-9 pr-3 rounded bg-surface-inset text-sm text-text
                placeholder:text-text-muted border border-border
                focus:border-accent focus:shadow-focus" placeholder="Search" />
</div>
```

---

## 7. Badges (unread count & labels)

### 7.1 Unread count badge

```html
<span class="min-w-5 h-5 px-1.5 rounded-full bg-danger text-accent-fg
             text-xs font-semibold flex items-center justify-center leading-none">
  7
</span>
```

- Pill shape via `rounded-full` + `min-w-5` so single digits stay circular.
- `99+` overflow: cap display text at `99+`.
- Mention badge (blue): swap `bg-danger` → `bg-accent`.

### 7.2 Unread dot (no count)

```html
<span class="w-2 h-2 rounded-full bg-accent"></span>
```

### 7.3 Status / label badges

```html
<span class="inline-flex items-center gap-1 px-2 h-5 rounded-sm text-xs font-medium">
```

| Label     | Classes (append)                          |
| --------- | ----------------------------------------- |
| Success   | `bg-success-muted text-success`           |
| Warning   | `bg-warning-muted text-warning`           |
| Danger    | `bg-danger-muted text-danger`             |
| Info      | `bg-info-muted text-info`                 |
| Neutral   | `bg-surface-raised text-text-secondary`   |
| New       | `bg-accent-muted text-accent`             |

---

## 8. Tooltip / popover / dropdown

```html
<!-- tooltip -->
<div role="tooltip"
     class="z-dropdown rounded-md bg-surface-overlay border border-border
            px-2 py-1 text-xs text-text shadow-md">Copy link</div>

<!-- dropdown menu -->
<div class="z-dropdown min-w-44 rounded-md bg-surface-overlay border border-border
            shadow-md py-1">
  <button class="w-full flex items-center gap-2 px-3 h-9 text-sm text-text
                 hover:bg-surface-raised">Edit</button>
  <div class="my-1 border-t border-border-subtle"></div>
  <button class="w-full flex items-center gap-2 px-3 h-9 text-sm text-danger
                 hover:bg-danger-muted">Delete</button>
</div>
```

---

## 9. Focus & accessibility

- All interactive elements use `focus-visible:shadow-focus` (2px offset accent ring).
- Never remove focus outlines without a visible replacement.
- Minimum hit target 32px (`h-8`); primary actions 40px (`h-10`).
- Presence dots and status badges pair color with text/icon, never color alone.
- Body text meets WCAG AA; primary text meets AAA (see `tokens.md §1.3`).
