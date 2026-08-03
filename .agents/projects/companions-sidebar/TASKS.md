# Companions in the Sidebar — Tasks

_Resume: Phases 1-3 done and browser-verified (PR #12451, draft). Uncommitted: none. Next: Phase 4 — migrate the ten `makeDeckCompanion` callers onto `makeCompanion({ scope })`, collapse to one `COMPANION_TYPE`, reconcile plugin-simple-layout, and rewrite plugin-deck DESIGN.md §4._

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

- [x] **Add `scope` to the companion builders** (`AppNode.CompanionScope`) —
      `makeCompanion` stamps `node`; `makeDeckCompanion` takes an optional
      `workspace | global`, defaulting to `global` so existing contributions are
      unchanged. `search` tagged `workspace`. Node types stay split for now;
      collapsing to one `COMPANION_TYPE` is Phase 4.
- [x] **ComplementarySidebar: three-group rail** — `useCompanionGroups` resolves
      the node group from the attended plank (`resolveCompanionAnchor`) and
      splits root connections by scope; `Position` orders within a group, a rule
      separates groups.
- [x] **Selection + attention rebinding** — tab values are `node/<variant>` for
      node companions and the bare variant for root ones (back-compatible with
      persisted `complementarySidebarPanel`). The stored value is a _preference_:
      a missing variant falls back to the node group's first companion without
      overwriting it.
- [x] **Fix `UpdateComplementary` clearing the selection** — it treated an absent
      `subject` as a change, so every collapse forgot the open panel. Now only an
      explicitly supplied subject counts.
- [x] **Verify** (Playwright against `ComplementarySidebarExpanded`): rail reads
      `node/alpha, node/beta, ---, storyPanel, storyInfo`; picking `node/beta` and
      attending another item rebinds the same variant to the new node; where the
      variant is absent it falls back to `node/alpha`; returning restores `beta`.
- [x] **Plank toolbar button** — removed rather than repointed. The sidebar rail
      is always visible, so a second per-plank affordance would be a redundant
      control that opens a panel following attention rather than that plank.

## Phase 3: Remove the in-deck companion machinery

Confirmed by the user: removal is part of the experiment, and it would not land
without it.

### Tasks

- [x] **Delete in-deck rendering** — `CompanionSplit`, `CompanionPlank`,
      `useDeckCompanion`, the `DeckPlank` linked-segment branch, the companion
      reveal-scroll effect, the companion sizing constants and `useSplitSize`
      (orphaned with the seam). `resolveTileSizes` collapses to `resolveTileSize`:
      a tile is now just its plank.
- [x] **Delete state + operations** — `companionPlanks` (schema, defaults,
      `set-active` pruning, `open`'s level-swap carry, `addCompanionPlank`), the
      `companion` plank adjustment, and the `anchor` field on
      `LayoutOperation.UpdateCompanion`. The operation now shows a companion in
      the sidebar: it keeps only the variant, since the sidebar resolves against
      whatever holds attention.
- [x] **Retire the companion view-state aspect** — selection lives solely in
      `complementarySidebarPanel`, so `companionAspect`,
      `COMPANION_VIEW_STATE_CONTEXT`, `useSelectedCompanion` and
      `useSelectedCompanionVariant` are gone. `plugin-assistant`'s chat
      provisioner reads the sidebar's selection instead (public helpers
      `getNodeCompanionVariant` / `makeNodeCompanionValue`).
- [x] **URL** — the companion pair is now driven by the sidebar's selection
      rather than `companionPlanks` + view state; it still serializes as
      `companion/<variant>` after the attended plank so a restore lands attention
      on the object the companion was showing.
- [x] **Fix consumers** — `useShowItem` docs, the joyride step (retargeted from
      the removed toolbar button to the rail's `data-joyride` hook), stale
      translations, and the legacy-state migration now drops `companionPlanks`
      explicitly.
- [x] **Stories** — `OnePlankWithCompanion`, `ManyPlanksWithCompanion` and the
      `CompanionPerPlank` play test removed (they assert in-deck rendering).
- [x] **Verify** — 80 unit tests (new `useCompanionGroups.test.ts` covers the
      preference/fallback rule), build, lint, and a browser pass confirming zero
      companion planks and zero toolbar toggles in the deck while the rail,
      rebinding and resize all still behave.

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

## Phase 5: Pop-out (clone a companion into the deck)

Design ratified in DESIGN.md §5 — clone semantics, pinned at pop time, node
scope only in v1, flatten gating, `context` URL key. NOT STARTED — design
approved, implementation awaiting go-ahead.

### Tasks

- [ ] **Pop button** on node-scoped sidebar panels (toolbar end), hidden while
      `flatten` is on. Click → `LayoutOperation.Open` with the companion node id
      (`<anchor>/~<variant>`), pivoted on the attended plank.
- [ ] **Clone plank rendering** — `DeckPlank` branch for linked-segment ids:
      ordinary plank chrome, `articleData` carries `companionTo` (source node
      data) + `variant`; source rendered as a breadcrumb (`useBreadcrumbs`,
      merging with the flatten trail when both apply).
- [ ] **Jump to source** — crumb click: source open → `ScrollIntoView`; closed →
      `Open` pivoted before the clone. Also a sigil-menu action.
- [ ] **URL** — clones take over `companion` chain pairs with a self-contained
      composite id (source ref + variant, so an orphaned clone round-trips);
      sidebar selection moves to a trailing `context` pair
      (`UrlPath.CONTEXT_KEY`; node preferences as `~<variant>`, root as bare
      id). Update url-handler serialize + parse and `serialize-deck-url` tests.
- [ ] **Assistant provisioner** — provision companion chats for popped assistant
      clones in `deck.active` regardless of sidebar state.
- [ ] **Attention linkage** — node-scoped sidebar panel headings become
      attention-aware (accent when the anchor is attended; workspace/global stay
      neutral); a clone's heading shows `related` when its source is attended
      (may need the source→clone direction added to the attention tracker).
- [ ] **Verify** — unit tests (URL round-trip incl. orphaned clone), browser
      pass: pop → pinned clone; attend elsewhere → clone unchanged, sidebar
      rebinds; attend clone → node group empty; crumb jump; dedup on re-pop.

### References

- `.agents/projects/companions-sidebar/DESIGN.md` — ratified shape + trade-offs.
- `packages/plugins/plugin-deck/DESIGN.md` §4, `packages/plugins/plugin-deck/TASKS.md`.
- `agents/superpowers/handoffs/2026-08-02-deck-companion-handoff.md` — defect history.
