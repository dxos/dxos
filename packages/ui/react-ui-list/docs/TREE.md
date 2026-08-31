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

## References

- https://ark-ui.com/docs/components/tree-view
