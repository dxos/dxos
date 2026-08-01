# Deck — Tasks

_Resume: PR #12424 open (companion beside the attended plank, named planks, exposé + FLIP, arrow-key
navigation, DESIGN.md rewrite); merged with main, auto-merge SQUASH armed, checks running. Design and
rationale live in [DESIGN.md](./DESIGN.md). Uncommitted: none._

The deck's own ledger. Split out of the `qa` project on 2026-08-01 — the deck stopped being a stream of
small UX corrections and became a work-stream of its own. Findings and the _why_ behind each mechanism
belong in [DESIGN.md](./DESIGN.md); this file is the list.

## Direction — plugin-declared decks

Design: [DESIGN.md §12](./DESIGN.md#12-proposed--plugin-declared-decks). The deck stops being one
global mode; a graph node may declare a deck spec, and the deck adopts it when that node is the root.

The key finding from the design pass: **most of the state plumbing already exists.** `StoredDeckState`
is already `decks: Record<string, DeckState>` with `activeDeck`/`previousDeck`, and `SwitchWorkspace`
already lazily creates and switches decks — only workspaces currently key one. Levels are the
generalization of the named planks that shipped in #12424, whose only production caller (the mailbox
passing `<mailbox>/message`) becomes the degenerate case. So this is mostly wiring, not new machinery.

Phased so each step is independently landable and verifiable:

- [ ] **P1 — spec on the node.** `DeckSpec` type + an `AppNode` annotation so a plugin can attach one;
      resolve it from the graph in the deck. No behaviour change yet. Unit-testable in isolation.
- [ ] **P2 — adoption.** Opening a spec-carrying node `'solo'` keys `decks[]` by its id and switches
      `activeDeck` (reusing `SwitchWorkspace`'s lazy-create path). Collection declares
      `initial: 'children'`. This alone fixes "selecting a Collection leaves attention on the current
      document" — the selection now changes the deck.
- [ ] **P3 — levels + pruning.** Opening at level `i` reuses that level's plank (existing `name`
      mechanism) and closes levels `> i`. Pure function beside `addSubjectsToActiveDeck`, so it gets
      unit tests. Mailbox declares `mailbox / message / attachment` and drops its hand-built name.
- [ ] **P4 — sizing intent.** `size?: number | 'fill'` consumed only when `plankSizing[id]` is absent,
      so the first user drag pins the width and the intent never fights them afterwards. `'fill'`
      divides the span `useMaxPlankWidth` already computes among the open `'fill'` levels.
- [ ] **P5 — container hooks.** `useDeckLevels().open(obj, { level })` / `.close({ level })` in
      `app-toolkit` (not `plugin-deck`, so pushing onto the deck does not require depending on the deck
      plugin — the same reason `LayoutOperation` lives there). Migrate `MailboxArticle` onto it.

Blocking questions, all in DESIGN.md §12 "What this does not settle":

- [ ] **Companion vs level** — a companion is arguably level 2 of exactly such a chain; two mechanisms
      for one idea should be resolved before this spreads.
- [ ] **URL** — the pair-chain grammar serializes `deck.active` and has no slot for _which_ deck. Needs
      agreement with the url-deck owner (josiah).
- [ ] **Deck lifetime** — `decks` is persisted and today bounded by workspace count; keyed by collection
      it grows without bound and wants eviction.

## Defects

- [ ] **Fullscreen: the back button is obscured by the plank's toolbar** — `ExitFullscreenButton` is
      `fixed top-2 right-2 z-[1]` (`DeckViewport.tsx`), which puts it in the same corner as the plank's
      own trailing toolbar controls and only one stacking level up. Either raise it above the plank
      chrome or move it out of that corner; note the plank is supposed to render `headless` in
      fullscreen, so check why its toolbar is showing there at all.
- [ ] **Resizing a plank should leave the trailing spines pinned to the viewport edge** — the right-hand
      pile only holds position because each tile's sticky `insetInlineEnd` is derived from its own width
      (`DeckViewport`'s tile style), and dragging a plank's width changes the natural offsets of every
      tile after it. While the drag is in flight the trailing spines drift instead of staying against the
      right edge. `useMaxPlankWidth` caps a plank to exactly the gap the two piles leave it, so the end
      state is correct — this is the during-drag behaviour.
- [ ] **Disable pointer events on planks while in the exposé** — the miniatures are live planks, so
      hovering and clicking still reaches their content. The tile hit-target covers each plank
      (`pointer-events-none` on the content), but the gutter, the toolbar and anything portalled out
      are not covered; audit and make the whole exposé inert apart from the tile targets.
- [ ] **Toolbar button to toggle collapsing a plank** — folding is currently only reachable by scrolling
      a plank into a pile; it should be an explicit control.

## Layout experiments

Shapes tried behind flags rather than committed to; see `Settings` in plugin-deck. Drop the flag once
one settles rather than leaving it a permanent preference.

- [x] **`overscroll`** — trailing runway so the last plank can be brought fully forward.
- [x] **`expand`** — plank toolbar toggle filling the space between the two spine piles.
- [x] **Exposé (`meta+;`)** — every plank at once, shrunk to fit; click one to return focused on it. The
      mounted `Mosaic.Stack` is scaled in place, so no plank remounts and no editor is instantiated
      twice; the transition is FLIP. Five constraints, each of which was a real defect first — all
      recorded in [DESIGN.md](./DESIGN.md) §7, since every one of them typechecks fine when broken.
- [x] **Arrow-key plank navigation** — left/right step to the previous/next plank and attend it, gated on
      `isPlankLevelFocus()` so a caret in an editor keeps its own arrows. DESIGN.md §9.
- [ ] **Move the plank navigation onto tabster** — the principled version is a Mover
      (`useArrowNavigationGroup`) on the stack with each tile a groupper, which is what `Focus.Group`
      (`packages/ui/react-ui/src/components/Focus/Focus.tsx`) already wraps. Blocked on `MosaicStackProps`
      being a narrow `ThemedClassName<… & Pick<…>>`: it forwards no arbitrary DOM props, so the
      `data-tabster` attributes cannot be attached without changing `react-ui-mosaic` (the same constraint
      that stopped `onClick` going onto `Mosaic.Container`). Worth doing with the Mosaic change, not
      before.
- [ ] **Drag planks in the exposé to reorder** — the exposé is where the whole deck is visible, so it is
      the natural place to reorder. The plumbing exists (`incrementPlank` in `layout.ts`, the
      `increment-start`/`increment-end` adjustments) and `PlankControls` still has those buttons
      commented out pending exactly this UX; the exposé tiles would drive it instead.
- [ ] **Plank snapping** — mobile already snaps (`snap-x snap-mandatory` + `snap-start`); desktop wants
      the snap points to be the pile positions (`index * SPINE_PX`) so planks land where the fold
      geometry expects them.
- [ ] **Decide the fate of the story's fold-animation harness** — `Deck.stories.tsx` injects
      `FOLD_ANIMATION_CSS` scoped by a `data-fold-anim` ancestor to A/B two fold transitions, selected by
      the `foldAnimation` arg (it carries a `TODO(burdon): Why in story?`). `crossfade` is the deck's
      shipped behaviour and adds no CSS at all; `slide` additionally translates the spine 10px along the
      plank's direction of travel. Either promote `slide` into `FoldSpine` and delete the harness, or move
      it behind a `Settings` flag beside `overscroll` — it should not stay as story-only CSS.

## Done

- [x] **Companion beside the attended plank** — the companion renders next to the plank it belongs to,
      sharing that plank's container across one `Splitter` seam, with per-plank open state
      (`DeckState.companionPlanks`). DESIGN.md §4.
- [x] **Named planks** — `LayoutOperation.Open` takes an optional `name`; opening under a name already
      taken replaces its occupant in place, the way a browser tab is reused. The mailbox passes
      `<mailbox>/message`, so reading down it no longer grows the deck one plank per message. Replaced
      the old `key` option, whose single call site always passed `undefined`. DESIGN.md §5.
- [x] **Rewrite DESIGN.md for the current deck** — the old one was the completed Plank-migration record
      and had drifted (`tilingSizing`, `companionOpen`, a three-way presentation).

## References

- [DESIGN.md](./DESIGN.md) — the design record: geometry, companion, exposé, operations, keyboard.
- `PLUGIN.mdl` — the navigation model (dispositions; what a click does).
- `.agents/projects/url-deck-redesign/DESIGN.md` — the URL grammar (josiah).
