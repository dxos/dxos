# Companions in the Sidebar — Tasks

_Resume: Phase 2 — unified companion rail (add `scope` to the companion builders, then the three-group rail). Uncommitted: none. Last: Phase 1 landed — the complementary sidebar is drag-resizable and the width persists._

## Phase 1: Resizable complementary sidebar

Standalone and useful regardless of the experiment's outcome. The sidebar width
was a fixed CSS var (`--dx-complementary-sidebar-size: 25rem`).

### Tasks

- [x] **Add a drag handle to the complementary sidebar's inner edge** —
      `SidebarResizeHandle` (generic over property/side, so the nav sidebar can
      reuse it). The drag writes the width property on `document.documentElement`
      (where the theme declares it, so `--dx-r1-size` recomputes) and keeps React
      out of the loop until release.
- [x] **Persist the width** — `complementarySidebarSize` in `StoredDeckState`,
      committed on pointer release and on each keyboard step.
- [x] **Suppress width transitions during a drag** — `data-sidebar-resizing` on
      `:root` zeroes the duration for the sidebar and the three main-content
      boxes; without it the deck trails the seam by 200ms. The keyboard path
      needs a synchronous layout flush, not a frame callback, because rAF runs
      before style recalc.
- [x] **Verify**: build, 77 unit tests, lint, and a Playwright drag against the
      new `ComplementarySidebarExpanded` story — drag tracks 1:1 (−100px pointer
      → +100px sidebar), clamps at 18rem, keyboard steps 4rem with Shift, and the
      deck's `padding-inline-end` tracks the seam in the same frame (400→460→560px
      against sidebar 1200→1140→1040).

### Notes

- Story surface ids must be camelCase in their final segment; hyphenated ids are
  dropped by the SurfaceManager and took the whole story render down with them.
- `DeckLayout.stories.tsx` gained two deck companions + a `ComplementarySidebar`
  story; its `NavContainer` now filters `disposition: 'hidden'` like the real
  navtree, so companions do not show up as tree rows.

## Phase 2: Unified companion rail in the sidebar

The sidebar rail shows node-scoped companions (attended plank) above the
existing root-level companions, grouped node → workspace → global.

### Tasks

- [ ] **Add `scope` to the companion builders** (`AppNode.ts`)
  - Single `makeCompanion({ scope: 'node' | 'workspace' | 'global', ... })`;
    keep `makeDeckCompanion` temporarily delegating to it with a scope tag.
  - Single `COMPANION_TYPE`; scope carried in `properties.scope`.
- [ ] **ComplementarySidebar: three-group rail**
  - Node group from `useCompanions(attendedPlankId)` (attention-resolved),
    workspace + global groups from root connections split by scope.
  - `Position.compare` within groups; separators between groups.
- [ ] **Selection + attention rebinding**
  - Node-scoped selection stored by variant; rebind on attention move; fall
    back to first available node companion when the variant is absent.
  - Panels render Article surface (node) / deckCompanion surface (workspace,
    global) as today.
- [ ] **Plank toolbar button** — repoint `plankHeading.companion` to expand the
      sidebar (or remove; decide by feel).
- [ ] **Verify**: DeckLayout + ComplementarySidebar stories, unit tests.

## Phase 3: Remove the in-deck companion machinery

### Tasks

- [ ] **Delete in-deck rendering** — `CompanionSplit`, `CompanionPlank`,
      `useDeckCompanion`, companion branch of `DeckPlank`, reveal-scroll effect,
      companion sizing constants + `plankSizing['companion']`.
- [ ] **Delete state + operations** — `companionPlanks`,
      `DeckOperation.Adjust {type:'companion'}`, `util/companion-anchor.ts`;
      rework `LayoutOperation.UpdateCompanion` to target the sidebar.
- [ ] **URL** — replace per-plank `companion/<variant>` chain pairs with a
      single `companion=<variant>` value; update url-handler tests.
- [ ] **Fix consumers** — `useShowItem` (app-toolkit) deck branch; e2e tests
      referencing `plankHeading.companion`.
- [ ] **Verify**: full plugin-deck suite, e2e where feasible.

## Phase 4: Migration + cleanup (only if the experiment is kept)

### Tasks

- [ ] **Migrate `makeDeckCompanion` callers** (10) to
      `makeCompanion({ scope })`; delete `makeDeckCompanion` +
      `DECK_COMPANION_TYPE`; classify each as workspace vs global (search =
      workspace; help/discord/activeCall/trace/diagnostics/debug/devtools/sample =
      global unless space-bound).
- [ ] **plugin-simple-layout** — reconcile its duplicated companion path.
- [ ] **Docs** — plugin-deck DESIGN.md §4 rewrite, graph-builder-api.md,
      plugin-sample guide; changeset.
- [ ] **Coordinate with burdon's `deck` project** — this supersedes the
      PR #12424 per-plank companion model.

### References

- `.agents/projects/companions-sidebar/DESIGN.md` — ratified shape + trade-offs.
- `packages/plugins/plugin-deck/DESIGN.md` §4, `packages/plugins/plugin-deck/TASKS.md`.
- `agents/superpowers/handoffs/2026-08-02-deck-companion-handoff.md` — defect history.
