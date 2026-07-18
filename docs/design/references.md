# WhatsApp Dark-Mode References

Visual reference for each ChatPulse component, taken from **WhatsApp Web / Desktop
dark mode** (the source design this system is modeled on). Use these as the
fidelity target when implementing the specs in `components.md` / `layout.md`.

> Note on assets: WhatsApp's UI is proprietary and screenshots cannot be
> redistributed in this repo. Each reference below documents the exact visual
> treatment (colors sampled to the tokens in `tokens.md`, measured dimensions,
> and layout) so the component can be reproduced without shipping a copyrighted
> image. To capture live references for internal review, open WhatsApp Web in
> dark mode (Settings → Theme → Dark) and screenshot the region described.

---

## Palette sampled from WhatsApp dark mode

| Region                | WhatsApp value | Token         |
| --------------------- | -------------- | ------------- |
| Top bar / input bar   | `#1F2C34`      | `header`      |
| Chat wallpaper base   | `#0B141A`      | `bg`          |
| Conversation list bg  | `#111B21`      | `panel`       |
| Outgoing bubble       | `#005C4B`      | `bubble-out`  |
| Incoming bubble       | `#1F2C34`      | `bubble-in`   |
| Accent / FAB / unread | `#00A884`      | `accent`      |
| Primary text          | `#E9EDEF`      | `text`        |
| Secondary text        | `#8696A0`      | `text-secondary` |
| Read tick (blue)      | `#53BDEB`      | `tick-read`   |

---

## 1. Conversation list item

**Where:** left panel, each chat row.
**Reference:** 72px-tall row on `#111B21`. 40px circular avatar at left with
12px gap. Right of it, two stacked lines: contact **name** (16px, `#E9EDEF`) with
the last-message **time** (11px, `#8696A0`) right-aligned on the same baseline;
below it the **preview** (14px, `#8696A0`) truncated to one line, with a green
`#00A884` unread pill right-aligned when there are unread messages. Hover tints
the row to `#233138`; the open chat stays tinted. Thin `#1D282F` divider under
the text column.

## 2. Message bubble — sent (outgoing)

**Where:** right side of the chat view.
**Reference:** teal-green `#005C4B` bubble, right-aligned, max width ~65% of the
chat area, 7.5px corner radius with the **top-right** corner squared into a tail
on the first bubble of a run. Body text 14.2px `#E9EDEF`. Bottom-right inside the
bubble: 11px timestamp `#8696A0` followed by the double-check read receipt
(`#53BDEB` when read). Subtle 1px drop shadow.

## 3. Message bubble — received (incoming)

**Where:** left side of the chat view.
**Reference:** dark-gray `#1F2C34` bubble, left-aligned, same 65% max width and
7.5px radius but with the **top-left** corner squared into the tail. In group
chats the sender's name shows on the first bubble in the accent color `#00A884`
(11px medium). Timestamp bottom-right, no ticks (ticks are outgoing-only).

## 4. Chat header

**Where:** top of the chat view (right panel).
**Reference:** 60px bar on `#1F2C34`. 49px avatar at left, then name (16px
`#E9EDEF`) over a subtitle line (11px `#8696A0`: "online" / "last seen…" for
DMs, or member names for groups). Right side: search (⌕) and overflow (⋮) icons,
`#8696A0`, in 40px round hit targets that tint on hover.

## 5. Input bar

**Where:** bottom of the chat view.
**Reference:** bar on `#1F2C34`. Emoji (☺) and attach (📎) icons at left in
`#8696A0`. A borderless rounded pill field (`#1F2C34`→ reads as `surface`) fills
the middle with placeholder "Type a message" in `#667781`. Trailing control is a
**mic** when the field is empty and a green `#00A884` circular **send** button
when there is text.

## 6. Profile avatar

**Where:** list rows, chat header, list top bar.
**Reference:** circular, `object-cover`, three sizes (34 / 40 / 49px). Optional
presence dot bottom-right with a 2px ring matching the surrounding bar
(`ring-panel` in the list, `ring-header` in the chat header). Initials fallback
uses an accent-muted `#103129` fill with `#00A884` text.

## 7. Read receipts

**Where:** bottom-right inside outgoing bubbles only.
**Reference:** 16px icon next to the 11px timestamp. States: clock (pending) →
single gray check (sent) → double gray check `#8696A0` (delivered) → double blue
check `#53BDEB` (read). Only the read state changes color; the double-check shape
carries meaning alongside color for accessibility.

---

## Reproducing screenshots for review

1. Open WhatsApp Web, Settings → Theme → **Dark**.
2. Capture each region above at 100% zoom on a retina display.
3. Store internal captures in `docs/design/references/` (git-ignored; not
   committed) and reference them in review threads — do not commit third-party
   screenshots to the repo.
