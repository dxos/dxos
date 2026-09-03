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
- **Hitbox modes**: `last-in-group` for a last sibling, `expanded` only for a branch that is
  actually showing children, else `standard`. The `branch &&` guard matters: a model that reports
  every node as open (a task list has nothing else to say about a leaf) otherwise puts leaves in
  `expanded`, and that mode exists precisely to drop the reorder-below zone — so nothing could be
  dropped after a childless row.
- **`leavesAcceptChildren`** (default off): whether a childless row offers a make-child zone. Off
  suits a tree whose leaves are terminal (navtree documents); a task list turns it on, since any
  task can gain a sub-task. With it off, a leaf shows no drop indicator at all on its middle band.
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
   **Correction (2026-09-01):** this entry previously claimed a real drop could only be verified by
   hand because native HTML5 drag cannot be automated. That is wrong. Playwright drives native drag
   in Chromium, so drops, zone boundaries and the resulting tree shape are all measurable — the drop
   semantics in §9 were established that way. Only a Storybook play function is still limited, since
   it has no driver.
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

| component | Ark marginal (raw / gzip) | displaces (attributed)              | net     | status   |
| --------- | ------------------------- | ----------------------------------- | ------- | -------- |
| Accordion | +8,125 / +2,038           | `@radix-ui/react-accordion` — 3,509 | +4.6 KB | **done** |
| Listbox   | +22,470 / +5,330          | custom `Listbox.tsx` — 2,493        | +20 KB  | no       |
| Combobox  | +87,936 / +26,847         | custom `Combobox.tsx` — 3,236       | +85 KB  | no       |

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

Accordion is the one that met that bar and has landed. It was never about bytes — it is net +4.6 KB —
but the component carried a `TODO(burdon): Support key navigation` and the machine supplies the APG
keymap outright. Verified in its story: ArrowDown moves focus between triggers and End jumps to the
last. The public surface (`Root`/`Item`/`ItemHeader`/`ItemBody`) is unchanged, so no consumer moved,
and `@radix-ui/react-accordion` is gone along with its `composer-app` prebundle entry. One structural
note for anyone porting another component: Ark exposes no `Header` part — `ItemTrigger` is the
control — so a header row that also holds trailing controls has to be a plain element wrapping the
trigger.

Listbox and Combobox remain "no" on the numbers above; nothing about the Accordion result changes
them.

## 8. `Treegrid` after the rebuild — deleted

`Tree.tsx` ended up with zero `Treegrid` references, where `main` rendered `Treegrid.Root` +
`Treegrid.Row`/`Cell`; the Ark markup absorbed the column layout via `grid-cols-subgrid`. Verified in
Storybook: the Tree renders `role="tree"` and `role="treeitem"`, with zero
`treegrid`/`row`/`gridcell`.

That decoupling had one consequence worth recording. `plugin-navtree`'s `NavTreeItemColumns` wrapped
its output in `Treegrid.Cell`, which was valid while the enclosing row was a `Treegrid.Row` and
became an orphaned `role="gridcell"` — no `row` ancestor — the moment the row became an Ark
`treeitem`. `display: contents` hid it from layout but not from the accessibility tree. Those
wrappers are gone.

With `Tree` no longer using it, `Treegrid` was left a standalone multi-column grid with three
consumers, only one of which was a hierarchy. All three have since moved and **the component is
deleted**:

| former consumer                     | moved to                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `devtools` `ObjectsTree`            | `Tree`, via a `TreeModel` view over its existing atoms                      |
| `plugin-assistant` `ProcessTree`    | `Tree`, via `createStaticTreeModel`                                         |
| `plugin-atproto` `AtprotoCompanion` | a plain `role="table"` — its rows are read-only, so it was never a treegrid |

The last of those is the point worth keeping: a component whose entire value is its ARIA role was
being used by two consumers that were not the thing that role describes, which is how the navtree
`gridcell` bug survived as long as it did.

## 9. Testing

Automated coverage lives in three places, and the drag contract is exercised end-to-end rather than
asserted structurally.

| layer                                                            | what it covers                                                                                                                 | how to run                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| unit — `hierarchy.test.ts` (26)                                  | placement algebra: above/below/make-child, indent, outdent, nudge, cycle and foreign-set rejection                             | `moon run react-ui-task:test`                    |
| unit — `tree-model.test.ts` (7), `static-tree-model.test.ts` (8) | topology from `parentTask`, sibling order, seeded collapse, path uniqueness                                                    | `moon run react-ui-task:test react-ui-list:test` |
| story — `TaskList.stories.tsx > Test Hierarchy` (16 in file)     | shape, levels, ordinals, collapse, `Shift+Arrow` restructuring, focus movement, row draggability, toggle/description alignment | `moon run react-ui-task:test-storybook`          |

**The drop gesture is not covered by the story suite** — a play function cannot drive native HTML5
drag. It was verified with Playwright driving real drags against `TaskList.stories.tsx`
`DragTargets` (`A` with children `B`, `C`), which is the fixture the drop rules are reasoned about
with. Measured zone map per 32px row, and the resulting tree after each drop:

| pointer band (32px row)           | instruction     | result                                                 |
| --------------------------------- | --------------- | ------------------------------------------------------ |
| y 4–7                             | `reorder-above` | before the target, as its peer                         |
| y 10–22                           | `make-child`    | **first** child of the target                          |
| y 25–31, x > ~52                  | `reorder-below` | after the target, as its peer                          |
| y 25–31, x 12–52, last child only | `reparent`      | after the target's ancestor — the way out of a subtree |

Two measurement traps, both of which produced wrong readings before they were understood:

1. **Re-measure the target after the drag starts.** The dragged row leaves the layout, so every row
   below it shifts up by its height and coordinates taken beforehand address the wrong row.
2. **The indicator cannot identify the zone.** `make-child` and `reparent` both render with the
   "child" orientation. Read `data-instruction` off the row instead — it carries the live
   instruction type for exactly this purpose.

### Manual script

Run `moon run storybook-react:serve` and open
`ui/react-ui-task/TaskList` → `Hierarchical Draggable`, then `Drag Targets`.

1. Click a row. It selects; the disclosure does **not** change. Click the same row again — now it
   toggles. This asymmetry is inherited from the machine's select-vs-toggle policy and is the one
   behaviour still open for a decision.
2. Click a chevron. The branch animates open and closed.
3. Press `ArrowDown`/`ArrowUp`. The highlight travels with focus — `selectionFollowsFocus`, which
   the task tree opts into. An APG tree leaves selection to an explicit activation; that is right
   when selecting navigates, and wrong here where selection only highlights a row.
4. Press `Shift+ArrowDown` / `Shift+ArrowUp`. The focused row moves among its siblings.
5. Press `Shift+ArrowRight` / `Shift+ArrowLeft`. The focused row indents under its previous sibling,
   or outdents to become its parent's next sibling.
6. In `Drag Targets`, drag `C`. It leaves the list for the duration of the gesture, so you see
   `A > B`. Check each landing place: before `A`; onto `A` (first child); before `B`; onto `B`;
   after `B`; and `A`'s bottom edge, which places `C` after `A`'s whole subtree as its next peer.
7. In `Hierarchical Draggable`, drag a row onto the **left end** of the last row's bottom edge (the
   first ~40px). That is the `reparent` band: the task lands after the last row's parent rather than
   joining it, which is the only way out of a subtree at its final row.
8. Drag a row that has children (`Approve the label art` in `Hierarchical Draggable`). The subtree
   goes with it and lands under the new parent.
9. Confirm every disclosure chevron sits on its title's centreline, including the row that carries a
   description.
10. Open `Drag Debug` to see every band at once, without holding a drag.

### Seeing the zones without dragging

`Tree` takes a `debug` prop that paints every row's bands and labels them — `above` / `child` /
`below` in blue and green, and one amber band per ancestor a `reparent` can lift the row out to.
`TaskList.Root` forwards it; the `Drag Debug` story turns it on. It is the fastest way to answer
"where do I aim", and it is how the missing band on an expanded branch was found — the overlay
showed `above,child` where every other row showed three.

### Indent: visual vs hitbox

`DEFAULT_INDENTATION` (8px) is what rows indent by; `DROP_INDENTATION` (24px) is what the hitbox
reasons in. They differ deliberately. The `reparent` zones under a last child are carved out of the
row's bottom band **by indent**, so at 8px they are 8px-wide strips: the instruction is produced and
measurable, but unhittable by hand — which presents as "there is no way to drop past the last
child". `TreeDropIndicator` keeps using the visual indent, so its line still lands under the row it
refers to.

### `dropBelowExpanded`: every row offers "after this subtree"

The hitbox gives an expanded branch no reorder-below zone, because "below the row" and "its first
child" are the same pixels; it offers `reparent` bands under the last descendant instead. Measured,
those bands are indent-wide slivers whose x-range moves with the row's depth — a drop aimed at one
produced no instruction at all. They are not a target anyone can aim at.

A task list does not need them: its "below" already resolves to _after the row and its sub-tasks_,
because the placement takes the target's parent and the sibling that follows it. So `Tree` takes
`dropBelowExpanded`, which keeps every row in `standard` mode and gives all of them the same three
bands. The task tree turns it on; it is off by default, since it changes what the zone means and the
navtree relies on the hitbox's own reading.

Verified by real drags: below an expanded, non-last branch lands the task after that branch's whole
subtree; below the last root lands it at the end of the list as that root's peer — the move that was
previously unreachable.

## 10. One row, one path (target)

Settled 2026-09-02 after a session in which every visual defect found by hand had the same cause:
`TaskList` had two implementations of one row — a flat `Listbox.Item` and a tree heading — and they
drifted. Circular status glyphs where the flat row had nine; a selected row whose icons faded; a
description misaligned against its title; a disclosure chevron off the title's centreline; chips
anchored left in one and right in the other; a title that went stale because only one path
subscribed to the object. None of these were disagreements about behaviour. They were copies.

### The shape

**One path.** Every mode renders through `Tree`. A flat list is a tree of depth one, and grouping is
already expressible: a node with `disposition: 'group'` renders as a section header and is spliced
out of the collection's topology, so keyboard traversal never lands on it.

**One row component, one grid per row.** Each row is its own grid: an `[indent]` track sized to
its depth, then the consumer's `gridTemplateColumns`, and _every_ cell — the toggle, whatever the
heading renders, every column — is a direct child of it. Not a subgrid: a subgrid shares one set of
tracks down the tree, and padding a subgrid only shrinks its first track, so nested rows could not
indent their leading cells. Rows still line up because every track but the consumer's `1fr` is
fixed — the indent is absorbed by the flexible one and the fixed trailing tracks stay anchored to
the row's end. The tree's own grid is one track that rows, section headers and the end target span.

The consumer authors the whole template and names its tracks; the task list's is built from its
options (the toggle track only for a hierarchical list — a flat one holds no square for a chevron):

```
[indent] Npx [tree-row-start] [toggle]? [gutter]? status title(1fr) chips [estimate]? priority [actions]? [tree-row-end]
```

Every fixed track is one control (`--dx-control`, the rail-item square each cell's `IconBlock`
holds), there is no column gap, and a track exists only when its option is on — so a cell is never
rendered into a track that is not there, and no track is held empty. Cells flow into the tracks in
DOM order; the names are for the pane and the description, which place themselves with `col-[name]`.
The edit pane lays out on the same template string, so its icon sits under the status column and its
field under the titles by construction rather than by a second hand-kept list of widths.

Owning a column is what keeps the trailing icons aligned down the list: sharing a flex cell made
their position depend on the width of whatever tag preceded them. The toggle used to sit in a flex
wrapper with a second, nested grid for the heading's cells — three layout systems for one row, and
two templates to keep in sync; that nesting is gone.

The second line is a property of the row, not of the task: the row's first grid row is pinned to
one control height so a described row and a bare one put their titles on the same baseline, and the
description places itself on `row-start-2` spanning `title` to the row's end.

### What this costs, accepted deliberately

Rows stop being `role="option"` and become `role="treeitem"`. Selection stops following focus as a
listbox property and becomes the tree's `selectionFollowsFocus` opt-in. Anything asserting listbox
semantics — `TaskSetArticle`'s behaviour story does — is updated as part of the change. This is a
real break, not an implementation detail.

### Ark: what we adopt and what we build on top

The parts are Ark's (`Root`/`Tree`/`Branch`/`BranchControl`/`BranchContent`/`BranchTrigger`/`Item`),
and two of their consequences are inherent rather than ours to fix:

1. `Branch` is `display: contents`, so `role="treeitem"`, `aria-level` and `aria-expanded` sit on the
   wrapper while the visible row is `BranchControl`. Selection styling therefore keys off zag's
   `data-selected`, and any test reading a level must go through `closest('[role="treeitem"]')`.
2. Ark's item anatomy is text plus indicator; it has no concept of trailing columns. The row grid is
   a composition _inside_ `BranchControl`/`Item`. That is not a deviation from the structure and it
   is not going away — a tree whose rows carry controls needs it.

### Consequence for the flat machinery

`walkTaskTree` and `dnd.ts` exist only to serve the flat path and go with it. `hierarchy.ts`'s
placement algebra (`resolveTaskPlacement`, `resolveIndent`, `resolveOutdent`, `resolveNudge`) stays —
it is the model-level meaning of a move and is shared by drag and the keyboard.

## References

- [MIGRATION.md](./MIGRATION.md) — which Ark **utilities** (focus-trap, hotkeys, format, frame,
  download-trigger) are worth adopting, measured the same way.
- https://ark-ui.com/docs/components/tree-view
