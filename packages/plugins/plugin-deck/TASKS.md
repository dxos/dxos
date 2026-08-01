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

Levels are the generalization of the named planks that shipped in #12424, whose only production caller
(the mailbox passing `<mailbox>/message`) becomes the degenerate case.

**Correction from implementation:** the design pass claimed the state plumbing was free because
`StoredDeckState` is already `decks: Record<string, DeckState>`. It is not. `activeDeck` doubles as the
_workspace identity_ — `url-handler` serializes it into the URL's workspace slot and switches the
workspace back whenever the parsed URL disagrees, and the `Layout` capability publishes it app-wide as
`workspace`. Re-keying it by a collection breaks URL round-tripping immediately. P2 therefore _seeds_
the active deck rather than creating one; a deck with its own identity is blocked on separating the two
and on the URL grammar (see below).

Phased so each step is independently landable and verifiable:

- [x] **P1 — spec on the node.** `DeckSpec` + `AppAnnotation.DeckAnnotation`; `makeObject` surfaces it
      onto the node beside the existing graph props. No behaviour change. 13 unit tests, including the
      schema round trip that guards the module-init cycle between `AppAnnotation` and `DeckSpec`.
- [x] **P2 — seeding.** Navigating to a node whose type declares `initial: 'children'` opens that
      node's openable children instead of a plank of the node itself; Collection declares it. Seeds a
      navigation only, never an add. Capped by `MAX_SEEDED_PLANKS` because every plank mounts an
      article surface. `openableChildren` is shared with `SwitchWorkspace`, which had the same filter
      inline.
- [x] **P2a — make a collection a navigation target.** Found by verifying P2 in Composer: the seeding
      never ran, because `makeObject` sets `selectable: false` on a Collection unless `navigable` is
      passed, and the navtree gates `handleSelect` on exactly that (`NavTreeContainer.tsx:125`).
      `plugin-space` passed `navigable: ephemeralState.navigableCollections`, true only when
      `plugin-stack` or `plugin-simpleLayout` is enabled — because until now only those could _render_
      a collection. The deck is a third answer to "what does navigating here show", so collections are
      now always navigable and `plugin-space` supplies the deck spec (`collectionDeck`), keeping the
      policy where it belongs: with stack/simple-layout enabled the collection still opens its own
      article, otherwise the deck opens its contents. `makeObject` gained a `deck` option for exactly
      this "depends on enabled plugins" case; the schema annotation stays for types with a fixed answer.
      Verified in Composer: clicking a collection with three documents opens three planks.
- [ ] **Top-level "Collections" row: open it, keep it inert** — DECIDED. Today it is a synthetic
      section node (`Node.make({ …, data: null })`, `plugin-space/.../extensions/collections.ts`) and
      the navtree's `handleSelect` returns early on `!node.data`, so it only expands. Make the click
      navigate and seed the deck with the space's top-level contents, while keeping the node
      non-draggable, non-droppable and out of the URL — it gains the behaviour without becoming a real
      object. That combination is a deliberate special case: leave a comment saying so, since a node
      that is selectable but not an object is exactly the kind of thing a later reader will try to
      "fix". Needs the seeding path to accept a root that is not the node's own data.
- [ ] **Replace `flatten` with a deck mode enum** — DECIDED: `mode: 'solo' | 'deck'` in `Settings`,
      replacing the boolean. `solo` shows one plank (plus its companion) with the rest as breadcrumbs;
      `deck` shows several side by side. An enum so a third mode has somewhere to go. Two things to
      handle rather than discover later: (1) `LayoutMode` already has `'solo'`/`'multi'`/
      `'solo--fullscreen'` and `LayoutOperation.Open` already has a `'solo'` disposition — three
      overlapping uses of the word, which need reconciling or at least a note saying why they differ;
      (2) the settings blob is a `Schema.Struct`, so dropping a boolean for an enum is a decode failure
      and falls back to defaults — acceptable under the drop-don't-migrate policy, but it silently
      resets the user's choice, so land it deliberately.
- [x] **P3 — levels + pruning.** `LayoutOperation.Open` takes `root` + `level`; `resolveLevelOpen`
      (beside `addSubjectsToActiveDeck`, 6 unit tests) reuses that level's plank, closes every level
      below it, and anchors to the level above rather than the end of the deck. The level supplies the
      plank name, so callers stop hand-building it. Mailbox declares
      `mailbox / message / attachment` via `AppAnnotation.DeckAnnotation` and `MailboxArticle` passes
      `root` + `level` instead of `name` + `pivotId`. NOT verified in a browser — needs a mailbox with
      messages; the attachment rung has no producer yet, so pruning is only covered by unit tests.
- [ ] **P4 — sizing intent.** `size?: number | 'fill'` consumed only when `plankSizing[id]` is absent,
      so the first user drag pins the width and the intent never fights them afterwards. `'fill'`
      divides the span `useMaxPlankWidth` already computes among the open `'fill'` levels.
- [ ] **P5 — container hooks.** `useDeckLevels().open(obj, { level })` / `.close({ level })` in
      `app-toolkit` (not `plugin-deck`, so pushing onto the deck does not require depending on the deck
      plugin — the same reason `LayoutOperation` lives there). Migrate `MailboxArticle` onto it.

Blocking questions, all in DESIGN.md §12 "What this does not settle":

- [x] **Companion vs level — RESOLVED: they are orthogonal, keep both.** A level is a _position in the
      chain_; a companion is a _per-plank affordance_. Every plank in `mailbox → message → attachment`
      can independently show or hide its own companion, so companions are cross-cutting and a plugin
      author never chooses between the two. Nothing about companions changes.
- [ ] **Per-collection deck memory — use attention view state, later phase.** DECIDED, and it dissolves
      the blocker rather than solving it: the plank set and widths a collection was left in belong in
      `react-ui-attention` view state, the same aspect the companion variant already uses
      (`util/companion-view-state.ts`). View state is per-attendable, global and deliberately absent
      from the URL, so `activeDeck` never has to be split from the workspace identity and josiah's
      grammar is untouched. Deferred to a later phase; P3–P5 do not depend on it.
- [x] **Deck lifetime — moot.** Unbounded `decks` growth was a consequence of keying `decks[]` by
      collection, which the decision above means we never do. Whatever view state's own retention needs
      turn out to be belong with that work, not here.

## Defects

- [ ] **Opening a companion slides the plank out and back** — the plank jumps right, off the viewport,
      then settles once the companion has opened. `useCollapseAfterAttended` re-runs on `companionId`
      by design (the companion arrives a commit after the attention that summoned it, so the first pass
      measures the deck before the pair widened) — the correction is landing as a visible round trip
      instead of before paint. Reported on 5174 with a real mailbox.
- [ ] **Opening/closing a message resets the mailbox list scroll** — the mailbox's own Mosaic stack
      appears to re-render wholesale and lose its scroll offset. Suspect the message open changing a
      prop identity that remounts the list rather than updating it; the deck's own planks are known not
      to remount (DESIGN.md §1), so this is likely inside `MailboxArticle`.

- [ ] **Seeding a collection highlights every child in the navtree** — the navtree marks anything in
      `layout.active` (`NavTreeContainer.tsx:56`), and seeding puts all the children there, so clicking
      a collection paints its whole subtree. Wanted: the collection reads as selected, not its contents.
      Needs a decision on what "active" means for planks the user did not open individually — either
      the deck reports the seed root instead of the seeded planks, or the navtree distinguishes
      "attended" from "open". Touches the `Layout` capability contract either way.
- [ ] **Whitespace right of the last plank at wide viewports** — reported from a ~2000px window; not
      reproducible at 1600px, where the geometry is packed tight (plank 1 `350→1150`, spine pinned
      flush at `1507→1551` against a viewport ending at 1551). Measure at the reporting width before
      theorising; likely interacts with `useMaxPlankWidth`'s cap or the trailing-pile inset.

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
      `isPlankLevelFocus()` so a caret in an editor keeps its own arrows. In the exposé the gate is
      dropped (its content is inert, so there is no caret to protect) and attention moves by focusing
      the target plank with `preventScroll`, leaving the exposé open and its scroll parked. No wrapping
      at either end. DESIGN.md §9.
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
