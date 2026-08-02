# Handoff: deck scroll/companion instability (Composer app vs storybook)

For an agent with zero prior context. All paths relative to the worktree
`/Users/burdon/Code/dxos/dxos/.claude/worktrees/blissful-nightingale-fc1283`, branch
`claude/plugin-deck-companion-position-0193ec`. Line numbers refer to the current working tree
(4 files uncommitted — see §7).

## 1. System orientation

- **The deck** is Composer's main region: a horizontal run of _planks_ (one per open object), rendered
  by `packages/plugins/plugin-deck`. Geometry: `src/containers/Deck/DeckViewport.tsx` — one
  `Mosaic.Container > ScrollArea.Viewport > Mosaic.Stack` scroller; each plank is a sticky tile
  (`DeckPlankTile`) pinning into left/right "spine" piles (stacked-notes pattern). Design record:
  `packages/plugins/plugin-deck/DESIGN.md`; ledger: `packages/plugins/plugin-deck/TASKS.md`.
- **A companion** is a per-plank side panel (chat/assistant etc.) sharing its plank's tile across a
  `Splitter` seam. Open state: `DeckState.companionPlanks: string[]` (`src/types/schema.ts`).
- **Levels** (new, this branch): a type declares a chain (mailbox → message → attachment) via
  `AppAnnotation.DeckAnnotation` / `DeckSpec` (`packages/sdk/app-toolkit/src/app-graph/DeckSpec.ts`);
  opening at a level reuses that level's plank. Mailbox declares it in
  `packages/plugins/plugin-inbox/src/types/Mailbox.ts`.
- **Attention** (`@dxos/react-ui-attention`) is focus-driven; planks are attendable containers
  (`data-attendable-id`). Synthetic `.click()`/`.focus()` do NOT move attention reliably — real
  pointer input does.

## 2. The user-visible defect and current status

Reported (user: burdon, in the real app at `http://localhost:5174`): planks jump when opening a
message from the mailbox and when opening that message's companion — slide right then back,
sometimes repeatedly; companion sometimes opens off-screen; the mailbox list flashes.

Status: three root causes fixed and app-verified (§5). **Still open:**

- **(A) One-frame scroll snap on companion open** — when the pair widens, the engine moves
  `scrollLeft` by exactly the width delta with **zero scroll commands** (measured 680→207 for a
  473px growth; `overflow-anchor: none` already applied and confirmed active, so it is NOT scroll
  anchoring — it is sticky-layout scroll adjustment). A pre-paint counter-restore exists
  (uncommitted, `DeckViewport.tsx:1417-1460` area) but is **unverified** and should be superseded by
  the root fix (§6).
- **(B) The diagnosed root of the whole class** — companion _state_ is per-plank but _rendering_
  resolves ONE anchor from attention; see §6. Not yet implemented.
- **(C) Mailbox list flash** — `InboxStack` (plugin-inbox) appears to fully re-render on message
  open/close (scroll preserved, content flashes empty). Untouched; likely a remount inside
  `MailboxArticle`/`InboxStack`, not a deck issue.

## 3. Gesture flow — every call site

**Clicking a message row in the mailbox plank:**

1. Row click: `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx`
   `handleMessageClick` (~~:447) / `handleCurrentChange` (~~:184) → `onAction({type:'current',
messageId, newPlank: metaKey||ctrlKey})`.
2. `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx` `handleAction` →
   `handleNavigate` (~:230-250): dispatches `LayoutOperation.Select` then `LayoutOperation.Open`
   with `{subject: ['<mailboxId>/<messageId>'], root: mailboxId, level: 'message',
disposition: 'add', navigation: 'immediate'}` (`:244`; meta-click omits root/level → own plank).
3. Open handler: `packages/plugins/plugin-deck/src/operations/open.ts` — validates path, dedups by
   EID, then:
   - seeding (collections): `resolveSeededPlanks` (`src/layout.ts`) using
     `resolveDeckSpec` (`src/util/resolve-deck-spec.ts` — node property, falling back to the type
     annotation because most plugins build nodes with bare `Node.make`, e.g. the mailbox in
     `plugin-inbox/src/capabilities/app-graph-builder.ts:81`);
   - level open: `resolveLevelOpen` (`src/layout.ts`, returns `{next, name, replacedId}`) — reuses
     the level's plank, closes deeper levels;
   - companion carry: if the replaced plank was in `companionPlanks`, the new plank inherits it
     (open.ts, "companion follows a level swap" block — uncommitted);
   - state write via `computeActiveUpdates` (`src/util/set-active.ts` — also prunes/dedupes
     `companionPlanks` to open planks) and `updatePlankNames` (`src/layout.ts`);
   - schedules `LayoutOperation.ScrollIntoView` for the newly opened plank (always: fallback
     `newlyOpen[0] ?? input.subject[0]`).
4. Scroll execution: `DeckViewport.tsx` `useScrollIntoView` (`:916`) — sets `scrollIntentRef`, calls
   `scrollPlankToPile` (`:877`; computes natural offset from tile widths — sticky rects lie —
   dedupes repeat commands, returns commanded left), then runs an **arrival watchdog** (re-issues
   with `force` if the deck sits still without arriving; a smooth scroll aborted by reflow was
   measured stranding the deck). `useFoldedPlanks` (`:690`) clears the intent on arrival and owns
   fold stamping + attention hysteresis.
5. In-deck click-to-front: delegated `pointerdown` on the stack (`DeckViewport.tsx` around
   `:1580-1620` in `DeckPlanks`) — deferred `CLICK_TO_FRONT_DELAY_MS=150` (`:866`) and DROPPED if a
   navigation intent appears or `planks` identity changed (the click/navigation two-writer collision
   fix); also skipped when the clicked plank is already attended.

**Opening the companion (toolbar toggle):**

1. Toggle button: `plugin-deck/src/containers/Deck/PlankControls.tsx`
   (`data-testid="plankHeading.companion"`); offered only when
   `companions.length > 0 && !deck.companionPlanks.includes(id)`
   (`src/containers/Deck/useDeckPlank.ts:89`).
2. `DeckOperation.Adjust {type:'companion'}`: `src/operations/adjust.ts:59-98` — seeds the selected
   variant into attention view-state, adds the plank to `companionPlanks`. (A
   `ScrollIntoView` scheduled here was removed — it yanked the plank.)
3. Close: companion pane X → `LayoutOperation.UpdateCompanion {subject:null}`
   (`src/operations/update-companion.ts:26`) — targets
   `resolveCompanionAnchor(deck.active, attention.getCurrent())`, i.e. the ATTENDED plank.
4. **Rendering (the crux)**: `DeckViewport.tsx` `useRenderedPlanks` (`:235-261`):
   ```
   anchorId   = findAttendedPlank(planks, attended) ?? last plank        // attention!
   companions = useCompanions(anchorId)
   companion  = anchorId ∈ deck.companionPlanks ? selectedCompanionId : undefined
   → { companionAnchorId: companion ? anchorId : undefined, companionId }
   ```
   Consumed in `DeckPlankTile` (`:433`): `companion = id === companionAnchorId ? companionId :
undefined` → tile width = plank + companion (`resolveTileSizes`), `CompanionSplit` renders the
   pair. `resolveCompanionAnchor`/`findAttendedPlank` live in `src/util/companion-anchor.ts`
   (longest-prefix match; also used by `src/capabilities/url-handler.ts:312` for URL serialization).
5. Reveal (uncommitted, verified): companion-appear effect in `DeckPlanks`
   (`DeckViewport.tsx:1417-1471`) — restores engine-shifted scroll pre-paint (unverified half) and
   glides by exactly the overflow so the pair ends on-screen.

**Storybook** (regression net): `plugin-deck/src/containers/Deck/Deck.stories.tsx` —
`LauncherManual` (`:580`): `TestLauncher` (`:121`) is a plank whose rows dispatch the exact
MailboxArticle level-open; graph node `story-launcher` (`:307`) carries `properties.deck` levels;
message children via connector `:319`. Also `TwoPlanks` / `ManyPlanksWithCompanion` with synthetic
`Companion Alpha/Beta` (`AppNode.makeCompanion` connectors). Run:
`tools/storybook-react`, `pnpm exec storybook dev -p 9021` from the worktree.

## 4. Evidence traces (how each cause was pinned)

Method: wrap `viewport.scrollTo` + the `scrollLeft` setter with stack capture, plus per-frame rAF
sampling of tile rects, in BOTH environments, real pointer input in the app.

- Collision: one message click → `scrollTo(0)` (click listener) + `scrollTo(680)` (navigation) —
  app and LauncherManual fixture identically.
- Dead glide: command issued, deck never moved a frame, settled at 0 (app) — reflow aborts smooth
  scrolls; hence the watchdog.
- Silent shift: pair widens → `scrollLeft` 680→207 (=−Δwidth), **no writer fired**, computed
  `overflow-anchor` verified `none` (`DeckViewport.tsx:1637`) — sticky layout adjustment.
- Phantom open: `companionPlanks` contains the plank, toggle button gone, but width unchanged and
  no companion attendable in the DOM — anchor (attention) was on another plank. Reproduced in the
  story by moving attention: one-frame widen (800→1280→800) then collapse.

## 5. Fixed and app-verified (committed locally, `a040f78935` and earlier)

- Click yields to navigation (defer + drop). Arrival watchdog. `overflow-anchor: none`.
- `companionPlanks` prune/dedupe (live profile had 14 entries with duplicates → 1).
- Scroll-on-intent redesign: exactly two animated scroll writers (`useScrollIntoView`, the click
  listener); the attention-inference collapse hook and its six guards are deleted. Rule recorded in
  DESIGN.md §3: a layout change must never scroll (reveal is the bounded exception).
- P1–P3 plugin-declared decks: `DeckSpec` + annotation; Collections navigable + seed their children
  (`plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts` `collectionDeck`);
  mailbox levels; `LauncherManual` fixture.

## 6. The planned root fix (not implemented)

Render a companion in **every** active plank whose id ∈ `companionPlanks` — not at one
attention-resolved anchor. Concretely: drop `anchorId`/`findAttendedPlank` from
`useRenderedPlanks`'s companion resolution; per tile, `companion = deck.companionPlanks.includes(id)
? companionForPlank(id) : undefined` (companions per plank via `useCompanions(id)`; selected variant
stays global view-state). Update `update-companion.ts` close-path to target the plank whose X was
clicked rather than the attended anchor. Then delete the uncommitted pre-paint restore. The user
explicitly ratified this model ("ANY plank has the option to show/hide its companion — companions
are genuinely cross-cutting"). Acceptance, frame-traced in the app: companion open/close on any
plank changes only that tile's width; no scroll change beyond the reveal; no phantom states;
attention movement never resizes tiles. Check perf note in `DESIGN.md` §4 (companion panels are
hide-not-unmount) before mounting many.

## 7. Repo/servers/state

- Worktree as above; shell resets to the MAIN checkout every turn — `cd` first; never write on main.
- Committed local-only: 24 files, +1191/−176 vs `origin/main`; **nothing pushed** (remote branch was
  deleted when PR #12424 squash-merged). 3 commits behind main.
- Uncommitted: `DeckViewport.tsx` (reveal ✓ verified / pre-paint restore ✗ unverified),
  `layout.ts` + `layout.test.ts` + `open.ts` (companion-follows-swap ✓ verified).
- Servers: 5174 = Composer `DX_PLUGIN_SET=minimal` vite dev from this worktree
  (`packages/apps/composer-app`); 9021 = worktree storybook. User's Chrome tab via claude-in-chrome
  MCP; real mailbox `rich@braneframe.com` in the profile. Chrome tab page zoom ≈84.5%: extension
  click coords = pageCoords / 1.1837 — recalibrate with a one-shot pointerdown probe. Playwright MCP
  drives 9021 at 100%.
- Suites: `pnpm --filter plugin-deck exec vitest run --project=node` (77) / `--project=storybook`
  (19); `moon run plugin-deck:build|lint`; `pnpm format` before commits.

## 8. Working with the user — honest record

The prior agent (me) asked the user to test/verify **thirteen times over ~21 hours** — including
after the user explicitly called it a waste of their time, and once more after claiming the asks had
stopped. Do not ask them to test, verify, choose mid-discovery, or set up environment you can reach
yourself. Storybook green false-cleared five bad fixes — verify in the app, frame-level, real
pointer. When environments diverge, THAT is the diagnosis: diff/degrade until they converge.
Feature-dropping mitigations are rejected. Answer direct questions immediately and first. Decisions
already made: companions ⊥ levels; `flatten` → `mode: 'solo'|'deck'` (pending); per-collection deck
memory via attention view-state (later); top-level Collections row opens-but-inert (pending).
