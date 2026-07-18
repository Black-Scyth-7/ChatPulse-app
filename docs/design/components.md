# Component Specs — ChatPulse (WhatsApp-inspired)

Exact Tailwind classes for every core component. All values reference tokens in
`tokens.md` / `tailwind.config.ts`. States (hover / focus / active / disabled)
are listed where applicable.

Covers all components required by the design system: **conversation list item,
message bubble (sent/received), chat header, input bar, profile avatar, read
receipts**, plus supporting components (badges, modal, buttons, inputs, menus).

---

## 1. Conversation list item

A row in the left panel. Avatar + (name, preview) + (timestamp, unread badge).
Single-line truncated preview. Default / hover / active / unread states.

```html
<a class="flex items-center gap-3 px-3 h-[72px] cursor-pointer
          hover:bg-surface-raised transition-colors duration-fast
          border-b border-border-subtle">
  <!-- avatar: §5 -->
  <img class="w-avatar h-avatar rounded-full object-cover shrink-0" />
  <div class="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
    <div class="flex items-center gap-2">
      <span class="text-name font-medium text-text truncate flex-1">Ada Lovelace</span>
      <span class="text-tick text-text-secondary shrink-0">9:41 AM</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-preview text-text-secondary truncate flex-1">
        Sounds great — see you then!
      </span>
      <!-- unread badge: §7.1 -->
      <span class="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-unread text-accent-fg
                   text-tick font-semibold flex items-center justify-center leading-none">3</span>
    </div>
  </div>
</a>
```

| Element        | Classes                                                        |
| -------------- | ------------------------------------------------------------- |
| Row            | `flex items-center gap-3 px-3 h-[72px] border-b border-border-subtle` |
| Avatar         | `w-avatar h-avatar rounded-full object-cover` (40px)          |
| Contact name   | `text-name font-medium text-text truncate`                    |
| Timestamp      | `text-tick text-text-secondary`                               |
| Preview        | `text-preview text-text-secondary truncate` (single line)     |

**States**

| State           | Classes to apply                                                     |
| --------------- | ------------------------------------------------------------------- |
| Default         | `bg-panel`                                                          |
| Hover           | `hover:bg-surface-raised`                                            |
| Active/selected | `bg-surface-raised` (persistent while chat open)                     |
| Unread          | name/preview `text-text`; show unread badge; timestamp `text-accent` |
| Muted chat      | preview `text-text-muted`; show muted icon before timestamp         |

Row height is 72px, matching WhatsApp's list density. The `border-b` uses
`border-subtle` and is inset under the text column in WhatsApp — a full-width
divider is an acceptable simplification.

---

## 2. Message bubble (sent / received)

Rounded bubble, `max-w-bubble` (65%), with a **tail** on the first message of a
group. Outgoing bubbles align right (teal green); incoming align left (dark
gray). Timestamp + read receipt sit inside the bubble, bottom-right.

### 2.1 Outgoing (sent) — teal green, right-aligned

```html
<div class="flex justify-end px-[5%] py-0.5">
  <div class="relative max-w-bubble rounded-bubble rounded-tr-none
              bg-bubble-out text-text shadow-sm px-2.5 py-1.5">
    <p class="text-message break-words whitespace-pre-wrap">
      On my way, be there in 5.
    </p>
    <!-- meta: timestamp + read receipt (§6) -->
    <span class="float-right ml-2 mt-1 flex items-center gap-1 select-none">
      <span class="text-tick text-text-secondary">9:42 AM</span>
      <!-- double blue tick = read -->
      <svg class="w-4 h-4 text-tick-read" aria-label="Read"><!-- §6 --></svg>
    </span>
  </div>
</div>
```

### 2.2 Incoming (received) — dark gray, left-aligned

```html
<div class="flex justify-start px-[5%] py-0.5">
  <div class="relative max-w-bubble rounded-bubble rounded-tl-none
              bg-bubble-in text-text shadow-sm px-2.5 py-1.5">
    <!-- sender name only in group chats, first bubble of group -->
    <span class="block text-tick font-medium text-accent mb-0.5">Grace Hopper</span>
    <p class="text-message break-words whitespace-pre-wrap">
      Perfect, I'll bring the deck.
    </p>
    <span class="float-right ml-2 mt-1 text-tick text-text-secondary select-none">9:43 AM</span>
  </div>
</div>
```

| Property        | Outgoing                          | Incoming                          |
| --------------- | --------------------------------- | --------------------------------- |
| Align           | `justify-end`                     | `justify-start`                   |
| Background      | `bg-bubble-out` (#005C4B)         | `bg-bubble-in` (#1F2C34)          |
| Tail corner     | `rounded-tr-none` (first of group)| `rounded-tl-none` (first of group)|
| Max width       | `max-w-bubble` (65%)              | `max-w-bubble` (65%)              |
| Radius          | `rounded-bubble` (7.5px)          | `rounded-bubble` (7.5px)          |
| Padding         | `px-2.5 py-1.5`                   | `px-2.5 py-1.5`                   |
| Body text       | `text-message text-text`          | `text-message text-text`         |
| Meta / receipt  | inside, bottom-right              | inside, bottom-right (no ticks)   |

**Grouping / tail rule:** only the **first** bubble in a run from the same
sender gets the tail (`rounded-tr-none` / `rounded-tl-none`). Continuation
bubbles keep all four corners rounded (`rounded-bubble`) and use a tighter gap
(`py-px`). Sender name shows only on the first incoming bubble of a group, and
only in group channels — never in 1:1 DMs.

---

## 3. Chat header (per-panel top bar)

The top bar of the **chat view** (right panel). Avatar + name/presence on the
left, action icons on the right. There is a separate list-panel top bar (see
`layout.md §3`); this is not a shared header.

```html
<header class="h-topbar shrink-0 flex items-center gap-3 px-4
               bg-header border-l border-border-subtle">
  <!-- back button: mobile only -->
  <button class="md:hidden p-1 text-text-secondary" aria-label="Back">‹</button>
  <img class="w-avatar-lg h-avatar-lg rounded-full object-cover shrink-0" />
  <div class="min-w-0 flex-1 leading-tight">
    <div class="text-name font-medium text-text truncate">Design Team</div>
    <div class="text-tick text-text-secondary truncate">Ada, Grace, Katherine, +4</div>
  </div>
  <div class="flex items-center gap-1 text-text-secondary">
    <button class="p-2 rounded-full hover:bg-surface-raised" aria-label="Search">⌕</button>
    <button class="p-2 rounded-full hover:bg-surface-raised" aria-label="Menu">⋮</button>
  </div>
</header>
```

| Element        | Classes                                                    |
| -------------- | --------------------------------------------------------- |
| Bar            | `h-topbar bg-header flex items-center gap-3 px-4` (60px)   |
| Avatar         | `w-avatar-lg h-avatar-lg rounded-full` (49px)             |
| Title          | `text-name font-medium text-text truncate`                |
| Subtitle       | `text-tick text-text-secondary truncate` (presence / members) |
| Action icon    | `p-2 rounded-full text-text-secondary hover:bg-surface-raised` |

Subtitle shows "online" / "last seen …" for DMs, or a member list for group
channels.

---

## 4. Input bar (composer)

Anchored bottom of the chat view. Sits on `header` bg (not the chat canvas).
Emoji + attach icons flank a rounded input field; the trailing button is a
**mic** when empty and a **send** (accent) when there is text.

```html
<div class="shrink-0 flex items-end gap-2 px-4 py-2 bg-header">
  <button class="p-2 text-text-secondary hover:text-text" aria-label="Emoji">☺</button>
  <button class="p-2 text-text-secondary hover:text-text" aria-label="Attach">📎</button>
  <div class="flex-1 flex items-end rounded-lg bg-surface px-3 py-2">
    <textarea rows="1"
      class="flex-1 min-h-composer max-h-[120px] resize-none bg-transparent
             text-message text-text placeholder:text-text-muted
             focus:outline-none leading-relaxed"
      placeholder="Type a message"></textarea>
  </div>
  <!-- send when text present; mic when empty -->
  <button class="p-2 w-10 h-10 rounded-full bg-accent text-accent-fg
                 hover:bg-accent-hover active:bg-accent-active
                 disabled:opacity-0 flex items-center justify-center"
          aria-label="Send">➤</button>
</div>
```

| Element      | Classes                                                    |
| ------------ | --------------------------------------------------------- |
| Bar          | `flex items-end gap-2 px-4 py-2 bg-header`                 |
| Icon button  | `p-2 text-text-secondary hover:text-text`                 |
| Field wrap   | `flex-1 rounded-lg bg-surface px-3 py-2`                   |
| Textarea     | `min-h-composer max-h-[120px] resize-none text-message`   |
| Send button  | `w-10 h-10 rounded-full bg-accent text-accent-fg`          |

The field itself has **no border** (unlike the Slack composer) — it reads as a
pill on the darker `header` bar. Focus is conveyed by the caret; add
`focus-within:ring-1 focus-within:ring-border-strong` if a stronger affordance
is wanted.

---

## 5. Profile avatar

Circular image with optional presence dot. Three sizes.

| Size | Dimension | Classes                                 | Usage                |
| ---- | --------- | --------------------------------------- | -------------------- |
| sm   | 34px      | `w-avatar-sm h-avatar-sm rounded-full`  | Inline, dense lists  |
| md   | 40px      | `w-avatar h-avatar rounded-full`        | Conversation list row|
| lg   | 49px      | `w-avatar-lg h-avatar-lg rounded-full`  | Chat header          |

```html
<div class="relative shrink-0">
  <img src="…" alt="Ada" class="w-avatar h-avatar rounded-full object-cover bg-surface-raised" />
  <!-- presence dot (optional) -->
  <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full
               ring-2 ring-panel bg-success"></span>
</div>
```

**Presence dot color by status:**

| Status  | Class        |
| ------- | ------------ |
| Online  | `bg-success` |
| Away    | `bg-warning` |
| DND     | `bg-danger`  |
| Offline | `bg-offline` |

The presence ring uses `ring-panel` in the list and `ring-header` in the chat
header so it blends into the surrounding bar.

**Fallback (initials):**

```html
<div class="w-avatar h-avatar rounded-full bg-accent-muted text-accent
            flex items-center justify-center text-name font-medium">AL</div>
```

---

## 6. Read receipts (ticks)

WhatsApp's delivery states, shown to the right of the timestamp inside an
**outgoing** bubble only. Incoming bubbles never show ticks.

| State     | Glyph          | Color            | Class                | Meaning                        |
| --------- | -------------- | ---------------- | -------------------- | ------------------------------ |
| Pending   | clock ◔        | `text-tick`      | `text-tick`          | Sending / not yet on server    |
| Sent      | single ✓       | `text-tick`      | `text-tick` (gray)   | Delivered to server            |
| Delivered | double ✓✓      | `text-tick`      | `text-tick` (gray)   | Delivered to recipient device  |
| Read      | double ✓✓      | `text-tick-read` | `text-tick-read` (blue) | Recipient has read it       |

```html
<!-- read (double blue tick) — 16px inline icon -->
<svg viewBox="0 0 18 18" class="w-4 h-4 text-tick-read" aria-label="Read">
  <path fill="currentColor" d="M17.4 5.5 8 14.9l-3.2-3.2.9-.9L8 13.1l8.5-8.5.9.9zM12.5 5.5 6.6 11.4l-.7-.7-.9.9.7.7.9.9L13.4 6.4z"/>
</svg>
```

- Size: 16px (`w-4 h-4`), vertically centered with the 11px timestamp.
- Only the **read** state uses `text-tick-read` (`#53BDEB`); every prior state
  is `text-tick` (`#8696A0`).
- Pair the color change with the double-check shape so state is not conveyed by
  color alone.

---

## 7. Badges

### 7.1 Unread count badge

```html
<span class="min-w-5 h-5 px-1.5 rounded-full bg-unread text-accent-fg
             text-tick font-semibold flex items-center justify-center leading-none">
  7
</span>
```

- Green pill (`bg-unread` = `#00A884`) with dark text (`text-accent-fg`).
- `rounded-full` + `min-w-5` keeps single digits circular.
- `99+` overflow: cap display text at `99+`.

### 7.2 Unread dot (no count)

```html
<span class="w-2.5 h-2.5 rounded-full bg-unread"></span>
```

### 7.3 Status / label badges

```html
<span class="inline-flex items-center gap-1 px-2 h-5 rounded-sm text-tick font-medium">
```

| Label   | Classes (append)                        |
| ------- | --------------------------------------- |
| Success | `bg-success-muted text-success`         |
| Warning | `bg-warning-muted text-warning`         |
| Danger  | `bg-danger-muted text-danger`           |
| Info    | `bg-info-muted text-info`               |
| Neutral | `bg-surface-raised text-text-secondary` |
| New     | `bg-accent-muted text-accent`           |

---

## 8. Buttons

Base (shared) classes:

```
inline-flex items-center justify-center gap-2 rounded font-medium
text-name h-10 px-4 transition-colors duration-fast
focus:outline-none focus-visible:shadow-focus
disabled:opacity-50 disabled:pointer-events-none
```

| Variant     | Classes (append to base)                                                   |
| ----------- | -------------------------------------------------------------------------- |
| Primary     | `bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active`    |
| Secondary   | `bg-surface-raised text-text hover:bg-surface-overlay border border-border`|
| Ghost       | `bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text` |
| Danger      | `bg-danger text-text hover:brightness-110 active:brightness-95`             |
| Link        | `bg-transparent text-info hover:underline h-auto px-0`                      |

The floating action button (new chat) is a 56px accent circle:
`w-14 h-14 rounded-full bg-accent text-accent-fg shadow-md`.

---

## 9. Input fields (forms)

### 9.1 Text input

```html
<label class="block">
  <span class="block mb-1 text-preview font-medium text-text-secondary">Channel name</span>
  <input type="text" placeholder="e.g. marketing"
    class="w-full h-10 px-3 rounded bg-surface-inset text-message text-text
           placeholder:text-text-muted border border-border-strong
           focus:outline-none focus:border-accent focus:shadow-focus
           transition-colors duration-fast" />
</label>
```

| Element     | Classes                                                     |
| ----------- | ---------------------------------------------------------- |
| Label       | `text-preview font-medium text-text-secondary mb-1`        |
| Input       | `h-10 px-3 rounded bg-surface-inset border border-border-strong` |
| Placeholder | `placeholder:text-text-muted`                              |
| Focus       | `focus:border-accent focus:shadow-focus`                   |
| Error       | `border-danger` + help text `text-danger`                  |
| Disabled    | `disabled:opacity-50 disabled:cursor-not-allowed`          |

### 9.2 Search input (list panel)

```html
<div class="relative px-3 py-2 bg-panel">
  <span class="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted">⌕</span>
  <input class="w-full h-9 pl-10 pr-3 rounded-lg bg-surface text-preview text-text
                placeholder:text-text-muted border-none
                focus:outline-none focus:shadow-focus"
         placeholder="Search or start a new chat" />
</div>
```

---

## 10. Modal / dialog

```html
<!-- backdrop -->
<div class="fixed inset-0 z-overlay bg-black/70 transition-opacity duration-slow"></div>

<!-- panel -->
<div role="dialog" aria-modal="true"
     class="fixed left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2
            w-full max-w-md rounded-lg bg-surface-overlay
            border border-border shadow-lg
            transition-all duration-slow ease-standard">
  <header class="flex items-center justify-between px-6 pt-6 pb-4">
    <h2 class="text-title font-semibold text-text">Create channel</h2>
    <button class="p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-surface-raised" aria-label="Close">✕</button>
  </header>
  <div class="px-6 pb-2 text-message text-text-secondary"><!-- body --></div>
  <footer class="flex justify-end gap-2 px-6 py-4 border-t border-border">
    <!-- buttons: §8 -->
  </footer>
</div>
```

---

## 11. Tooltip / popover / dropdown

```html
<!-- dropdown menu (⋮ header action) -->
<div class="z-dropdown min-w-44 rounded-md bg-surface-overlay shadow-md py-1">
  <button class="w-full flex items-center gap-2 px-4 h-10 text-preview text-text
                 hover:bg-surface-raised">Contact info</button>
  <button class="w-full flex items-center gap-2 px-4 h-10 text-preview text-text
                 hover:bg-surface-raised">Mute notifications</button>
  <div class="my-1 border-t border-border-subtle"></div>
  <button class="w-full flex items-center gap-2 px-4 h-10 text-preview text-danger
                 hover:bg-danger-muted">Delete chat</button>
</div>
```

---

## 12. Focus & accessibility

- All interactive elements use `focus-visible:shadow-focus` (2px offset accent ring).
- Never remove focus outlines without a visible replacement.
- Minimum hit target 40px for header/composer icon buttons.
- Presence dots, status badges, and read receipts pair color with shape/icon —
  never color alone.
- Body/message text meets WCAG AA; primary text meets AAA (see `tokens.md §1.4`).
