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
- [ ] **Take the tabster prize — as a `@dxos/react-ui` project, not an Ark one.** Only three files
      keep tabster in boot, all in `react-ui`: `Focus/Focus.tsx`, `Main/MainContext.ts` (one
      `useFocusableGroup` call) and `Carousel/Carousel.tsx`. The other ten importers are lazy and
      attribute zero boot bytes — **including all four in `react-ui-list`, so migrating this package
      off tabster saves nothing**. Ark is not the replacement: Zag's focus management is per-machine,
      while these three need a generic roving-tabindex/groupper (Ark ships `focus-trap`, a trap, not
      a groupper). Plan: a small in-house roving-tabindex hook for `Focus.Group`/`MainContext`, with
      Ark's `carousel` a candidate for the third.
- [ ] Evaluate Ark's Accordion on merit (+4.6 KB net over `@radix-ui/react-accordion`) — the only
      swap cheap enough to decide on behavior alone.
