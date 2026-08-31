# ark — Tasks

_Resume: PR [#12873](https://github.com/dxos/dxos/pull/12873) is open — `react-ui-list: rebuild Tree
on @ark-ui/react TreeView`. Design lives in
[`packages/ui/react-ui-list/docs/TREE.md`](../../../packages/ui/react-ui-list/docs/TREE.md), not
here. Bundle impact is measured and accepted (~17 KB brotli on one lazy chunk; the eager boot graph
moves 1.6 KB and the boot budget is untouched). The open work is the ARIA regression the rebuild
introduced in navtree, the doc refresh, and a decision on what `Treegrid` is for now that `Tree` no
longer uses it._

## Phase 1: Tree rebuild on Ark (PR #12873)

Landed on the branch. Detail, decisions and the experiment log:
[docs/TREE.md](../../../packages/ui/react-ui-list/docs/TREE.md).

- [x] **Rebuild `Tree` on `@ark-ui/react` TreeView** — machine-owned focus/ARIA, APG keymap
      (arrows, Home/End, typeahead, `*`), atom walk into a controlled `TreeCollection`.
- [x] **Keep pragmatic-drag-and-drop** — `TreeData` payload and the navtree `monitorForElements`
      contract unchanged.
- [x] **Preserve the public prop surface** so `plugin-navtree` needed no code changes.
- [x] **Measure the bundle impact** — both branches built with `moon run composer-app:bundle` and the
      emitted assets diffed. Numbers in docs/TREE.md §6.

## Phase 2: Fallout from the rebuild

- [x] **Remove the orphaned `gridcell` roles in navtree.** The five `Treegrid.Cell` wrappers in
      `NavTreeItemColumns.tsx` emitted `role="gridcell"` with no `row` ancestor once the enclosing
      row became an Ark `treeitem`. Removed; the empty one is a plain `<div />` holding the actions
      column in the subgrid. Verified live: the navtree renders `role="tree"` + 3 `treeitem` and
      **0 `gridcell`**, with the sidebar visually unchanged. `plugin-navtree` build + lint green.
- [x] **Refresh the stale docs.** `react-ui-list/DESIGN.md` component table and the Tree/Treegrid
      diagrams now describe the Ark machine; `AUDIT.md:136` lists the real consumers;
      `useListNavigation.ts:100` no longer says `Tree (Treegrid)`. The measured bundle analysis,
      adoption economics and Treegrid disposition are folded into `docs/TREE.md` §6–§8.
- [x] **Settle the `NavTree` Default story.** Not a branch regression — it does render and the tree
      is correct; cold boot in a headless probe just exceeds 30 s. Recorded in docs/TREE.md §5 as an
      open question about whether that cold-start cost can trip the play function's 10 s timeout in
      CI.

## Phase 3: `Treegrid` disposition (tracked follow-up)

Tracked 2026-08-31. The rebuild decoupled `Tree` from `Treegrid` entirely — `Tree.tsx` has zero
`Treegrid` references where `main` had `Treegrid.Root` + `Treegrid.Row`/`Cell`. That leaves
`Treegrid` a generic multi-column grid primitive with three consumers, **two of which are not trees**:

| consumer                              | API used                             | shape                                |
| ------------------------------------- | ------------------------------------ | ------------------------------------ |
| `plugin-navtree` `NavTreeItemColumns` | `Cell` only — no Root/Row            | vestigial; removed by Phase 2        |
| `devtools` `ObjectsTree`              | Root + Row + Cell + `TreeItemToggle` | real expandable hierarchy            |
| `plugin-assistant` `ProcessTree`      | Root + Row + Cell, 4 cols            | pre-flattened rows, no disclosure    |
| `plugin-atproto` `AtprotoCompanion`   | Root + Row + Cell, 3 cols            | flat field table; `depth` is padding |

- [ ] **Decide what `Treegrid` is for.** Either keep it as a generic multi-column grid primitive and
      **rename it** (`role=treegrid` misdescribes two of its three uses), or migrate `ObjectsTree`
      onto `Tree` and delete it. Do not "replace it with `Tree`" wholesale: `ProcessTree` would gain
      nothing (no disclosure to model) and `AtprotoCompanion` is a flat table that wants a grid.
- [ ] **Scope the `ObjectsTree` → `Tree` migration** — the only genuine candidate, but it is a
      rewrite onto the `TreeModel` atom-family contract, not a swap.
- [ ] Drop the stale `Treegrid` mention in `react-ui-list/src/hooks/useListNavigation.ts:100`.

## Phase 4: Deferred — wider Ark adoption

Measured and **not** recommended as a cost-saving exercise; see docs/TREE.md §7. The shared Zag
runtime is ~24.5 KB raw and the Tree has already paid all of it, so every further machine is marginal
cost against a much smaller hand-rolled component (Accordion +4.6 KB net, Listbox +20 KB, Combobox
+85 KB). Migrate for behavior, not for amortization.

- [x] **Measure what a full `@fluentui/react-tabster` removal would net.** Done — numbers and the
      conclusion in docs/TREE.md §7. **68,256 bytes minified in the eager boot graph** (`tabster`
      59,820 + `keyborg` 6,298 in `boot-4`, plus the 2,138-byte fluentui wrapper in `boot-5`); the
      used API surface bundles to 76,623 raw / 21,736 gzip / 19,392 brotli. Bigger than the entire
      Ark Tree cost, and in the eager graph rather than a lazy chunk.
- [ ] Evaluate Ark's Accordion on merit (+4.6 KB net over `@radix-ui/react-accordion`) — the only
      swap cheap enough to decide on behavior alone.
- [ ] **Evaluate moving the core of `react-ui-list` and `@fluentui/react-tabster` to
      `@ark-ui/react`** — the whole-stack version of the question, as one evaluation rather than
      per-component. Tracked 2026-08-31. Constraints below.

### Constraints on that evaluation

Already measured (docs/TREE.md §6–§7) — these are what the evaluation has to answer, not assumptions
to re-derive:

1. **Bundle size is not the case for it.** Ark's shared Zag runtime is ~24.5 KB raw and the Tree
   already bought all of it; per-machine marginal cost then runs Accordion +8,125 raw, Listbox
   +22,470, Combobox +87,936 — each against a hand-rolled component an order of magnitude smaller. A
   full `react-ui-list` sweep is net **worse** on bytes.
2. **Tabster and `react-ui-list` are separable problems.** All four `react-ui-list` tabster call
   sites are in lazy chunks and attribute zero boot bytes; the 68 KB prize is behind three
   `@dxos/react-ui` files. Migrating this package off tabster saves nothing, and taking the prize
   does not require touching this package.
3. **Ark has no groupper.** `useArrowNavigationGroup`/`useFocusableGroup` are generic
   composite-widget focus zones; Zag's focus management is per-machine and `focus-trap` is a trap.
   Any plan that ends tabster needs an in-house roving-tabindex hook regardless of how much Ark is
   adopted.
4. **The case, if there is one, is coherence** — one interaction/accessibility model across the
   package instead of four (Ark machine, tabster roving-tabindex, Radix, bespoke activedescendant),
   with APG conformance maintained upstream. Size the migration against that, and price the ~85 KB
   Combobox explicitly since it is the one that decides the total.

## Phase 5: Replace `@fluentui/react-tabster`

Tracked 2026-08-31. The largest measured win available in this area, and — despite living in this
ledger — **a `@dxos/react-ui` project, not an Ark adoption**. Prize: **68,256 bytes minified in the
eager boot graph** (`tabster` 59,820 + `keyborg` 6,298 in `boot-4`, plus the 2,138-byte fluentui
wrapper in `boot-5`); the used API surface bundles to 76,623 raw / 21,736 gzip / 19,392 brotli.
Larger than the entire Ark Tree cost, and in the eager graph rather than a lazy chunk. Evidence:
docs/TREE.md §7.

Three constraints, all measured:

1. **Only three files keep tabster in boot**, all in `@dxos/react-ui`: `Focus/Focus.tsx`,
   `Main/MainContext.ts` (a single `useFocusableGroup` call) and `Carousel/Carousel.tsx`. Removing
   tabster from those three is what collects the 68 KB.
2. **The other ten importers are lazy and attribute zero boot bytes** — `plugin-deck`,
   `plugin-support`, `sdk/shell`, `react-ui-tabs`, `react-ui-masonry`, and all four in
   `react-ui-list`. They must still be migrated to remove the dependency outright, but they are not
   where the win is.
3. **Ark is not the replacement.** Zag's focus management is per-machine; `focus-trap` is a modal
   trap, not a roving-tabindex groupper — see docs/MIGRATION.md §1. The API to replace is
   `useArrowNavigationGroup`, `useFocusFinders`, `useFocusableGroup` and
   `useMergedTabsterAttributes_unstable`.

### Tasks

- [ ] **Write the in-house roving-tabindex/groupper hook** in `@dxos/react-ui` covering
      `useArrowNavigationGroup` + `useFocusableGroup`. This is the whole project's critical path.
- [ ] **Cut the three boot-reachable files over** (`Focus.tsx`, `MainContext.ts`, `Carousel.tsx`),
      then re-run `moon run composer-app:bundle` + `check-boot-budget` and confirm the eager graph
      drops by ~66 KB. Ark's `carousel` machine is a candidate for the third file if the hook does
      not cover it cleanly.
- [ ] **Migrate the remaining ten importers** to drop the dependency from `package.json` entirely.
- [ ] **Re-baseline `MAX_PRELOAD_BYTES`** in `composer-app/scripts/check-boot-budget.mjs` downward
      once the win lands — a budget left at 4.45 MB silently absorbs the gain.
