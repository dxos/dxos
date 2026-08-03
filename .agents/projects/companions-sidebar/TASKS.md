# Companions in the Sidebar — Tasks

_Resume: Phase 1 — resizable complementary sidebar. Uncommitted: project scaffold. Last: design ratified (node/workspace/global scopes, tabs kept, no settings toggle, one-panel trade-off accepted)._

## Phase 1: Resizable complementary sidebar

Standalone and useful regardless of the experiment's outcome. The sidebar width
is currently a fixed CSS var (`--dx-complementary-sidebar-size: 25rem`).

### Tasks

- [ ] **Add a drag handle to the complementary sidebar's inner edge**
  - Override `--dx-complementary-sidebar-size` inline on `Main.Root` (or the
    sidebar element) while dragging; min/max clamps.
  - Only at `lg`+ (below `lg` the sidebar is a drawer).
- [ ] **Persist the width**
  - New `complementarySidebarSize` in `StoredDeckState`
    (`plugin-deck/src/types/schema.ts`), written on drag end — mirror the
    `plankSizing` pattern.
- [ ] **Verify**: build, unit tests, storybook smoke of `DeckLayout` stories.

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
