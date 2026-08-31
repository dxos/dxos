# Tree — design

Rebuild of the `react-ui-list` Tree on `@ark-ui/react` TreeView (the zag.js machine), replacing the
tree used by the composer navtree sidebar. Run as an experiment: zag machine state bridged to our
reactivity (effect-atom, ECHO) and coexistence with pragmatic-drag-and-drop. The broader theme and
hover-card audit this came from lives in the `ui-theme-tree` project ledger
(`.agents/projects/ui-theme-tree/DESIGN.md`).

## 1. Prior state (audit)

The pre-rebuild Tree was the one component that predated the list rewrite: monolithic (no namespace
parts), five atom-family `TreeModel` interface, bespoke arrow-key handling in `Treegrid` (Left/Right
both just toggle — not the APG grammar; no Home/End/typeahead), non-standard `aria-current=''`
styling (neither `dx-current` nor `dx-selected`), no disclosure animation, per-item pragmatic-dnd
effect with the tree-item hitbox, group headers hard-coded as a special case, and real defects:
`aria-level=0` on every row, a no-op `rowRef.focus()`, mixed path separators in stories, ~170 lines
of scaffolding required to mount a static tree in a story.

## 2. Decision

**Adopt `@ark-ui/react` TreeView** as the machine + accessibility layer; keep everything DXOS on
top: theme tokens, pragmatic-dnd, atoms/ECHO state, end-of-row menus. Rationale:

- Complete WAI-ARIA keymap (arrows per APG, Home/End, typeahead, `*`, multi-select) for free —
  the part our implementation never caught up on.
- Controlled `expandedValue`/`selectedValue`/`focusedValue` (string arrays + change callbacks) maps
  directly onto our atom families; this is the reactivity experiment: zag machine state bridged to
  effect-atom/ECHO.
- No native DnD in Ark — which is what we want: pragmatic-dnd layers on the parts, and the
  `TreeData` payload / `monitorForElements` contract with navtree is unchanged.
- MIT, actively maintained (Chakra v3 builds on the same machine); already referenced as prior art
  in `ui-template` (zag spike) and the solid catalog.

Known gaps accepted up front:

1. **No measured-height disclosure animation** — BranchContent is `hidden`-toggled with no
   `--height` var. As built, enter animates `block-size: 0 → auto` via
   `interpolate-size: allow-keywords` (opacity carries the reveal where unsupported), and exit runs
   a conceal animation first: expansion is controlled, so the model close commits only when the
   animation (or its timeout) completes.
2. Zag's roving tabindex owns item focus; end-of-row menu buttons are `tabIndex=-1` (APG-correct)
   rather than tabster-groupper steps. Noted as an experiment finding either way.
3. Ark keys state by node **value**, not path — we use the joined path as the value, which
   preserves the current per-path open state semantics (same node expandable independently at two
   locations).

## 3. Architecture (as built)

- Dependency: `@ark-ui/react` via catalog, consumed by `react-ui-list`.
- **The public `Tree` prop surface is preserved** (model + callbacks + `renderColumns` +
  `gridTemplateColumns`) so `plugin-navtree` needed zero code changes — the internals are the Ark
  parts (`Root`/`Tree`/`Branch`/`BranchControl`/`BranchContent`/`BranchTrigger`/`Item` via
  `NodeProvider`). A full consumer-API re-namespacing was deliberately deferred: it would have
  ballooned the port without changing what the experiment tests.
- **Reactive walk → collection**: one atom walks the `TreeModel` families (childIds, item,
  itemProps, itemOpen, itemCurrent) into an entry tree; any dependency change recomputes the walk
  and hands the machine a fresh immutable `TreeCollection` plus the controlled
  `expandedValue`/`selectedValue` arrays. Node value = joined path (per-path state preserved).
- **Selection policy**: machine `onSelectionChange` is the single select path; input modifiers
  (alt/shift) are captured on `pointerdown` and consulted within a 500ms window (zag callbacks
  carry no input event). Re-activating an already-selected row (toggle a current branch, re-open a
  current leaf) is a row-level `onClick`, since the machine emits no event for an unchanged
  selection. `expandOnClick=false` keeps navtree's click-navigates semantics; the chevron is
  `BranchTrigger` (zag stops propagation, so it never selects).
- **DnD**: `draggable`/`dropTargetForElements` + tree-item hitbox moved from the heading button to
  the row element; spring-loaded expand and drag-collapse via `onOpenChange`; `TreeData` payload
  and the navtree `monitorForElements` contract unchanged; `TreeDropIndicator` kept.
- **Groups**: rendered as section headings; **spliced out of the collection topology** (their
  children become machine-children of the group's parent) so keyboard traversal never lands on a
  header. Levels are carried on the entries, so group children stay at the header's indent.

## 4. Findings (experiment log)

1. **zag role placement**: `role=treeitem` + `aria-selected`/`aria-expanded` land on the Branch
   _wrapper_; the visible row (BranchControl) is `role=button` with `data-selected` only. Since the
   wrapper is `display: contents`, selection styling keys off `data-[selected]` on the row — a
   deliberate deviation from the `aria-selected ↔ dx-selected` grammar (leaf Items do carry
   `aria-selected`, so the grammar holds there).
2. **`hidden` vs utility classes**: zag collapses BranchContent with the `hidden` attribute; any
   display utility (`grid`) overrides the UA rule, so BranchContent needs `[&[hidden]]:hidden`.
   Generalizable gotcha for any zag/Ark part styled with Tailwind display classes.
3. **Atoms ↔ machine bridge works cleanly**: fully-controlled expanded/selected + diffing the
   change details onto per-path `onOpenChange`/`onSelect` callbacks round-trips through the navtree
   ViewState atoms with no double-fires observed. Cost: any state change rebuilds the whole walk +
   collection (fine at sidebar scale; a memoized incremental walk is the escalation path).
4. **pragmatic-dnd coexists with the machine** — no interference between zag's pointer handling
   and draggable/dropTarget on the same element (draggable attr stamped, instructions render).
   Real drop verification needs a human drag (native HTML5 drag can't be automated).
5. Verified 17/17 generic checks (render, chevron + full keyboard expand/collapse incl. typeahead
   keymap, click/keyboard selection, select-vs-toggle policy, groups, draggable wiring, zero
   console errors) plus navtree story parity vs main (identical DOM facts + pixel-equivalent
   screenshots) and the plugin-navtree play tests (7/7).

## 5. Open items

- Multi-select (`selectionMode='multiple'` is plumbed but unused; Shift+Arrow range selection
  untested against navtree semantics).
- Tabster-groupper equivalent for end-of-row controls (currently reachable by pointer only, per
  APG); evaluate zag's expectations before wiring tabster inside machine-owned rows.
- The `NavTree` Default story takes >30 s to boot from cold in a headless probe, which exceeds the
  play function's 10 s `findByRole('tree')` timeout. It does render and pass once warm; whether the
  cold-start cost can trip CI is unmeasured.

## 6. Bundle cost

Both branches built with `moon run composer-app:bundle` and the emitted assets diffed — measured,
not estimated.

|                  | main                   | branch                 | delta            |
| ---------------- | ---------------------- | ---------------------- | ---------------- |
| All JS (raw)     | 66,609,021             | 66,691,226             | +82,205 (+0.12%) |
| All CSS          | 633,414                | 633,957                | +543             |
| Eager boot graph | 4,382,549 (22 entries) | 4,384,201 (22 entries) | +1,652 (+0.04%)  |

`scripts/check-boot-budget.mjs` reads 4.18 MB against its 4.45 MB ceiling on both sides: Ark lands in
a lazy chunk, so the boot budget is untouched.

The cost concentrates in the one chunk holding `@dxos/react-ui-list`:

|        | main   | branch  | delta           |
| ------ | ------ | ------- | --------------- |
| raw    | 44,758 | 111,917 | +67,159 (+150%) |
| gzip   | 14,744 | 34,487  | +19,743         |
| brotli | 13,398 | 30,580  | +17,182         |

That chunk is not modulepreloaded, but 119 chunks import it and it sits in the entry's
`__vitePreload` dependency list, so it is fetched as soon as the shell renders the sidebar — a cost
paid on essentially every session, just not before first paint.

Attributed through the chunk's sourcemap mappings (minified, pre-gzip): `@zag-js/tree-view` 21,792 ·
`@zag-js/collection` 11,657 · `@ark-ui/react` 8,136 · `@zag-js/dom-query` 6,538 ·
`@zag-js/collapsible` 4,934 · `@zag-js/react` 4,848 · `@zag-js/core` 3,708 · `@zag-js/utils` 2,274 ·
`anatomy`+`types` ~742 — **~64.6 KB**. Bundling `@ark-ui/react/tree-view` + `createTreeCollection`
standalone with React externalized gives 66,493 raw / 18,003 brotli, within ~1% of the in-app delta,
which is what makes the attribution evidence rather than a guess.

Two things check out clean: **no duplicate Zag runtime** (the 78 `@zag-js/*` lockfile entries are
install-graph only and all resolve to `1.43.3`, the catalog pin `ui-template` already uses; ten reach
the bundle), and **the barrel tree-shakes** — `import { TreeView } from '@ark-ui/react'` bundles to
66,445 bytes against 66,493 for the deep subpaths, so the usual barrel footgun does not apply here.

## 7. Wider Ark adoption is not a saving

The amortization argument fails from both ends. Ark's shared Zag runtime is ~24.5 KB raw (Accordion
alone costs 32,580; added on top of the Tree it costs 8,125) — and the Tree has already bought all of
it. Every further machine is marginal cost against a much smaller hand-rolled component:

| component | Ark marginal (raw / gzip) | displaces (attributed)              | net     |
| --------- | ------------------------- | ----------------------------------- | ------- |
| Accordion | +8,125 / +2,038           | `@radix-ui/react-accordion` — 3,509 | +4.6 KB |
| Listbox   | +22,470 / +5,330          | custom `Listbox.tsx` — 2,493        | +20 KB  |
| Combobox  | +87,936 / +26,847         | custom `Combobox.tsx` — 3,236       | +85 KB  |

Combobox is the outlier because it drags in a floating layer the Tree never needed —
`@zag-js/popper` + `@zag-js/dismissable` + `@floating-ui/core` + `@floating-ui/dom`, ~27.5 KB of its
105 KB standalone size — and only two chunks in the app reference floating-ui today, so there is no
dedupe waiting.

### The tabster lever, measured

The one lever that would justify a sweep is dropping `@fluentui/react-tabster`. Attributed through
the boot chunks' sourcemaps, what actually ships is **68,256 bytes minified in the eager boot
graph** — `tabster` 59,820 + `keyborg` 6,298 in `boot-4`, plus the 2,138-byte fluentui wrapper in
`boot-5`. The used API surface (`useArrowNavigationGroup`, `useFocusFinders`, `useFocusableGroup`,
`useMergedTabsterAttributes_unstable`) bundles standalone to 76,623 raw / 21,736 gzip / 19,392
brotli.

That is a **larger prize than the whole Ark Tree migration cost, in the more expensive location** —
the eager graph the boot budget governs, rather than a lazy chunk.

Two findings decide how to go after it:

1. **Only three files keep it in boot**, all in `@dxos/react-ui`: `Focus/Focus.tsx`,
   `Main/MainContext.ts` (a single `useFocusableGroup` call) and `Carousel/Carousel.tsx`. The other
   ten importers — `plugin-deck`, `plugin-support`, `sdk/shell`, `react-ui-tabs`, `react-ui-masonry`
   and **all four in `react-ui-list`** — are in lazy chunks and attribute **zero** boot bytes.
   Migrating `react-ui-list` off tabster therefore saves nothing at all.
2. **Ark cannot replace it.** Zag's focus management is per-machine, scoped inside a tree/tabs/
   listbox. Tabster's job in those three boot-critical files is generic composite-widget focus zones
   over app chrome — a roving-tabindex/groupper layer. Ark ships `focus-trap` (a trap, not a
   groupper) and has no `useArrowNavigationGroup`/`useFocusableGroup` equivalent.

So a tabster removal is worth doing and is **not an Ark project**: it means writing a small
roving-tabindex/groupper hook for `Focus.Group` and `MainContext`, with Ark's `carousel` as a
plausible answer for the third file. It also does not get cheaper by migrating more of this package.

**Migrate a component to Ark for its behavior, not to spread a fixed cost. There is none left to
spread.**

## 8. `Treegrid` after the rebuild

`Tree.tsx` now has zero `Treegrid` references, where `main` rendered `Treegrid.Root` +
`Treegrid.Row`/`Cell`; the Ark markup absorbed the column layout via `grid-cols-subgrid`. Verified in
Storybook: the Tree renders 1 `role="tree"` and 4 `role="treeitem"`, with zero
`treegrid`/`row`/`gridcell`.

That decoupling had one consequence worth recording. `plugin-navtree`'s `NavTreeItemColumns` wrapped
its output in `Treegrid.Cell`, which was valid while the enclosing row was a `Treegrid.Row` and
became an orphaned `role="gridcell"` — no `row` ancestor — the moment the row became an Ark
`treeitem`. `display: contents` hid it from layout but not from the accessibility tree. The wrappers
are removed; the empty one is now a plain `<div />` holding the actions column in the subgrid.

`Treegrid` is left a standalone multi-column grid primitive with three consumers, only one of which
is a hierarchy — devtools `ObjectsTree`; `plugin-assistant`'s `ProcessTree` pre-flattens its rows and
has no disclosure, and `plugin-atproto`'s `AtprotoCompanion` is a flat field table whose `depth` is
inline padding. Disposition (rename to match what it is, or migrate `ObjectsTree` onto `Tree` and
delete it) is tracked in the `ark` project ledger.

## References

- [MIGRATION.md](./MIGRATION.md) — which Ark **utilities** (focus-trap, hotkeys, format, frame,
  download-trigger) are worth adopting, measured the same way.
- https://ark-ui.com/docs/components/tree-view
