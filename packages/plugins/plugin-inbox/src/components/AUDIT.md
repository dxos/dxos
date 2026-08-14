# Message summary/header representations — audit

_Ways to render the "summary line(s)" of a message across the inbox components. This audit tracks the
divergence ahead of reconciling them into shared primitives that land in `@dxos/react-ui-inbox` (see
the plugin-level [`AUDIT.md`](../../AUDIT.md) §4c)._

> Refreshed 2026-07-21 — the earlier version described a `CollapsedCard` / `Listbox` split that no
> longer exists. The opened-thread view now renders a single expand/collapse message tile.

## The two major forms (conceptual model)

Both are built on the same **Stack** (Mosaic) system, differing only in their Tile — and both tiles
lay out on a **Grid** (a `Card` grid vs. an ad-hoc subgrid):

1. **`InboxStack`** (renamed from `MessageStack`) — the **Card-based** list for `MailboxArticle`. One
   Stack with two Tile sub-variants: a single-message tile and a conversation-group tile.
2. **`ConversationStack`** (renamed from `MessageThread`; already lived in the `ConversationStack/`
   dir, but its exported API was confusingly still called `MessageThread`) — the **expanded** thread
   view for `MessageArticle`. One Tile that naturally handles a singleton or a full conversation with
   the same UI (expand/collapse per message).

The four summary renderings below are the Tiles/cards these two forms (plus the `MessageCard` preview)
compose from — the reconciliation target.

## Call sites

- **`InboxStack` → `MessageTile`** — the mailbox list tile (one message).
- **`InboxStack` → `ConversationTile` → `ConversationMessageRow`** — a message row inside a grouped
  conversation tile in the list.
- **`ConversationStack` → `MessageTile`** — a message in the opened thread (collapsed summary row,
  expands to subject/recipients + details + body).
- **`MessageCard`** — the Card/anchor preview surface (`react-surface` `messageCard`).

## The three, compared

|             | **MessageTile** (list)                     | **ConversationMessageRow** (grouped preview) | **ConversationStack MessageTile** (opened thread) |
| ----------- | ------------------------------------------ | -------------------------------------------- | ------------------------------------------------- |
| Container   | `CardTile.Root` / `CardTile.Header` (Card) | `Card.Row` inside a `ConversationTile`       | subgrid rows (`grid-cols-subgrid`) on the tile    |
| Avatar      | **`Row.Person avatar`** (gutter)           | **hand-rolled `DxAvatar`** size 6            | **hand-rolled `DxAvatar`** size 9                 |
| Avatar hue  | `toHue(hashString(displayName))`           | `getMessageProps().hue`                      | `getMessageProps().hue`                           |
| Lead line   | **subject** + date                         | **sender name** + date                       | **sender** (`h2`); date in col 3                  |
| Secondary   | snippet (`Card.Text`)                      | snippet (`line-clamp-2` button)              | snippet when collapsed; subject/to when expanded  |
| Star / menu | `CardTile.Header` menu + star              | —                                            | `Row.Star` + `MessageMenu` (expanded only)        |
| Data source | `getMessageProps({ compact })`             | `getMessageProps({ compact, time })`         | `getMessageProps()`                               |

## What stands out

1. **Two of the three hand-roll `DxAvatar`** (grouped preview + opened thread) instead of going
   through `Row.Person`. Only the list tile uses the shared `Row.Person avatar` primitive.
2. **Two avatar-hue inputs.** All three ultimately call `@dxos/util` `toHue(hashString(...))`, but the
   list tile hashes the **resolved display name** (`contact.fullName ?? name ?? email`) while the other
   two hash `getMessageProps().from`. Same sender can render a **different avatar color** in the list
   vs. the opened thread.
3. **Lead field differs by intent** — list leads with _subject_; the two thread contexts lead with
   _sender_ (Gmail-thread style, where the subject is already implied by the thread). This divergence
   is likely deliberate and worth preserving via a variant, not flattening.

## Reconciliation — decided (2026-07-21)

**No `MessageSummary` composite.** The four renderings differ on nearly every axis (container, avatar
shape/size, lead, trailing, secondary); one primitive parameterizing all of that would be a
variant-matrix god-component — more code than the four plain renderings it replaces, and it would
fight `ConversationStack`'s expand/collapse subgrid. The four layouts are different on purpose; keep
them.

**What is worth fixing is the avatar, not the layout.** The one genuine defect is the avatar:

- Three of the four sites **hand-roll `DxAvatar`** (`@dxos/lit-ui`) off `getMessageProps().hue`; only
  the list tile uses `Row.Person`, which hashes the _resolved display name_ instead — so the same
  sender can render a **different color** in the list vs. the thread.
- Repo-wide, **plugin-inbox is the only consumer of `DxAvatar`** — everywhere else uses react-ui's
  `Avatar`. The inbox avatar has diverged from Composer as a whole.

Fix: one shared avatar primitive (actor/name → single hue derivation), used by `Row.Person` and by the
three hand-rolled sites. Leave the four layouts as they are. This lands in the shared card package —
see the low-level shared-primitive inventory in the plugin [`AUDIT.md`](../../AUDIT.md) §4c.

## Stages

- [x] Stage 0 — audit (this file), refreshed to current reality; `MessageSummary` dropped.
- [x] Stage 1 — one shared `Avatar` primitive (`components/Avatar/`) + single `nameToHue`; all four
      sites routed through it; `getMessageProps.hue` removed.
- [x] Stage 2 — extracted `Row`, `CardTile`, `Avatar` (+ `useActorContact`, `hashString`, 3 i18n keys)
      into `@dxos/react-ui-card`; plugin-inbox imports them from there.
