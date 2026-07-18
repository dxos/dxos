# Message header representations — audit

_Three different ways to render the top line(s) of a message "header" across the inbox components.
This audit tracks the divergence ahead of reconciling them (staged)._

## Call sites

- `MessageStack` → `MessageTile` (Card) — the mailbox list tile.
- `ConversationStack` → `Content` → `ReadTile`:
  - `CollapsedCard` — a folded message in an opened thread.
  - `Message.Header` — an expanded message in an opened thread.

## The three, compared

|               | **MessageTile** (list)            | **CollapsedCard** (folded thread)          | **Message.Header** (expanded)       |
| ------------- | --------------------------------- | ------------------------------------------ | ----------------------------------- |
| Container     | `Tile.Root` / `Tile.Header` (Card) | `Listbox.Root` / `Listbox.Item`            | `Header.Root` (Card rows)           |
| Lead line     | **subject** + date                | avatar + **sender name** + snippet + date  | star + **subject** `<h2>`           |
| Sender        | `Row.Person avatar` (in body)     | hand-rolled `DxAvatar` + `Listbox.ItemContent` | `Row.Person role='from'`        |
| Date          | in title line                     | trailing span                              | own `Card.Row`                      |
| Avatar hue    | `Row.Person` → `hashToHue(name)`  | `getMessageProps.hue` → `toHue(from)`      | (anchor, no avatar)                 |
| Data source   | `getMessageProps`                 | `getMessageProps`                          | reads `message.properties` + `Row.Person` |

## What stands out

1. **CollapsedCard is the outlier** — the only one that bypasses `Row.Person`/`Card.*` and hand-rolls
   the avatar + sender + snippet inside a `Listbox`. The other two already share `Row.*` + `Card`/`Tile`.
2. **Two avatar-color paths** — `MessageTile`'s avatar uses `hashToHue(name)` (via `Row.Person`);
   `CollapsedCard` uses `getMessageProps.hue` = `toHue(from)`. The same sender can render a **different
   avatar color** in the list vs. the collapsed thread.
3. **Lead field differs by intent** — list & expanded lead with _subject_; collapsed leads with
   _sender_ (Gmail-thread style). That divergence may be deliberate (thread context already implies the
   subject).

## Reconciliation options

1. **Minimal — fold `CollapsedCard` onto the shared blocks.** Rebuild it with `Card` + `Row.Person avatar`
   (+ `Card.Text` snippet) so all three go through `Row.Person`. Kills the hand-rolled avatar and the
   divergent hue path; keeps each layout's distinct lead field.
2. **Extract one `MessageSummary` primitive** — avatar + primary/secondary line + date + snippet, with a
   `variant`/`density` (or `lead: 'subject' | 'sender'`) prop, consumed by all three.
3. **Just fix the divergences** — unify the avatar-hue derivation (one function/one input) and leave the
   three layouts as-is.

## Stages

- [x] Stage 0 — audit (this file).
- [ ] Stage 1 — remove the wrapper `<div>` collapse affordance around `Message.Toolbar` in `ReadTile`
  (move the collapse behavior into `Message.Toolbar`).
- [ ] Stage 2+ — reconcile the header representations (per an option above).
