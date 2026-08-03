# Companions in the Sidebar — Tasks

_Resume: Phases 1-2 done and browser-verified (PR #12451, draft). Uncommitted: none. Next: decide on Phase 3 — removing the in-deck companion path means deleting the per-plank model from PR #12424, so confirm with burdon first._

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
- [ ] **Plank toolbar button** — `plankHeading.companion` still opens the
      in-deck companion; repoint it at the sidebar as part of Phase 3.

### Open question for the user

Both paths now coexist: companions render in the sidebar _and_ can still be
opened in the deck. Good for side-by-side comparison, but not the end state —
Phase 3 deletes the in-deck path, which means deleting the per-plank companion
model that shipped in PR #12424. Confirm before doing that.

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
