# Spike: the next Tree on Ark tree-view

Can Ark UI's `tree-view` (zag) back the next `Tree` in `@dxos/react-ui-list/next`, driven by the existing
`TreeModel`? AUDIT §6 point 2 and DESIGN.md Phase 4 decision 4 asked for this spike before choosing between
(1) Ark tree-view, (2) the current Tree logic restyled on Container, and (3) a Listbox with indentation.

**Verdict: option 1.** Options 1 and 2 turn out to be the same option. The current `Tree`
(`src/components/Tree/Tree.tsx`) already runs on Ark's `TreeView` machine, with a controlled walk, pragmatic-dnd and
`react-ui-virtual` windowing. So the next Tree is the current Tree's logic on the Next row, with three changes this
spike shows work: a lazy walk, flat rows, and a fixed-block window. Option 3 would rebuild tree keyboard semantics
(Left/Right, `aria-level`, `aria-expanded`, typeahead over visible nodes) that zag already provides.

## What was built

| File                      | What                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tree-collection.ts`      | `createTreeWalkAtom`: the `TreeModel` → zag adapter (lazy, visible rows only) and `createCollection`                                                                          |
| `Tree.tsx`                | a private `Tree` namespace: `Root` (controlled Ark `TreeView.Root`), `Label`, `Content` (Ark's `tree` element as a ScrollArea viewport, optional windowing), `Item` (the row) |
| `tree.css`                | row styles; they belong in `@dxos/react-ui/next/theme` on adoption                                                                                                            |
| `Tree.stories.tsx`        | `Default` (static model, draggable), `Large` (5,000 rows, windowed), `Test`, `OpenTest`, `StaticTest`, `WindowedTest`, `Benchmark` (tagged `!test`)                           |
| `tree-collection.test.ts` | the walk reads only open branches; opening re-walks; 5,000-row walk timing                                                                                                    |

Not exported from `src/next/index.ts`.

## 1. Can a `TreeModel` feed zag's collection lazily?

Yes. See `createTreeWalkAtom` in `tree-collection.ts`. The walk is one `Atom` that reads `childIds`, `item`,
`itemProps`, `itemOpen` and `itemCurrent` only along open paths. A closed branch contributes its own node with
`childrenCount = props.parentOf.length` and no `children`. That is enough for zag's `isBranchNode` (children _or_ a
count), so the branch gets `aria-expanded`, the trigger and ArrowRight. When the branch opens, its `itemOpen` atom
changes and the walk re-runs, now reading that branch's `childIds`.

- Evidence: `tree-collection.test.ts` "reads only open branches". For a 50 × 99 tree with every branch closed, the
  walk reads `childIds` for the root only, produces 50 rows, and zag reports each row as a branch with `[]` children.
- zag's own lazy loading (`loadChildren`) is **not needed** and does not fit. It expects a Promise of child _nodes_
  and splices them in with `collection.replace` (`@zag-js/tree-view/dist/utils/expand-branch.mjs`), which is a second
  source of truth beside the atoms. Without `loadChildren`, zag's expand only sets `expandedValue`. We control that
  value and forward the change to `onOpenChange`, and the model does the loading.
- The current Tree's walk (`src/components/Tree/Tree.tsx` `createTreeWalkAtom`) recurses into **every** branch,
  open or not. So it materialises and subscribes to the whole tree. This lazy walk is the first thing to port back.
- Two adapter caveats: zag's `getNodeState` reads `node.disabled` rather than the collection's `isNodeDisabled`, so
  the node carries `disabled`. And node values are joined paths (`Path.create`), as today, so one item at two paths
  keeps independent state.
- Cost: walk plus `createTreeCollection` for 5,000 open rows takes **33.5 ms** (node, `tree-collection.test.ts`), paid
  once per model change.

## 2. Expansion, selection, current, keyboard

These come from zag unchanged and are covered by `Test` and `WindowedTest`:

- ArrowUp/Down, ArrowRight (open, then first child), ArrowLeft (parent, then close), Home/End, typeahead,
  Enter/click select, `aria-level`, `aria-expanded`, `aria-selected`, and the roving tabindex. All of these go through
  the collection, not the DOM, so they work unchanged when rows are windowed.
- Expansion and selection are fully controlled (`expandedValue`/`selectedValue` from the walk). The machine's
  `onExpandedChange`/`onSelectionChange` are diffed into per-node `onOpenChange`/`onSelect` calls, and the model's
  atoms feed the result back.

We must add, and the current Tree already implements each of these (port them):

- **`current` vs selected.** `TreeModel.itemCurrent` maps to zag selection. A separate "you are here" state, if
  needed, has no zag equivalent.
- **Modifier-aware activation.** zag's callbacks carry no pointer modifiers, so the current Tree records them on
  `pointerdown`. The same applies to `selectionFollowsFocus`, `canSelect`, option-click toggling, Enter on an
  already-selected row (zag emits nothing), and Space toggling a branch.
- **Focus restore after a drop**, via a controlled `focusedValue` (the current Tree's `focusNode`/`claimFocus`).
- **Group headers** (`disposition: 'group'`) are spliced out of the collection today. The spike does not render
  them. Next would map them to `ItemGroup`/`ItemGroupLabel` (part-naming rule 6).

## 3. Virtualization at 5,000 visible rows

It works with zag. Rows render **flat**, in visible pre-order, never nested in `BranchContent`. Each branch row is a
`display: contents` `TreeView.Branch` (the `treeitem`) around its `BranchControl`, so ARIA keeps the hierarchy
through `aria-level`/`aria-expanded`. zag navigates the collection, so the DOM needs only the rows in view.

- **Windowing** (`virtualize='window'`). Rows are exactly one block tall (question 5), so the window is arithmetic:
  measure the first row once, then slice with `OVERSCAN = 8`, with a spacer above and below. Because it uses
  spacers rather than a transform, rows stay in the grid flow and keep the Container subgrid. zag calls
  `scrollToIndexFn` before focusing a row that may be unmounted (End, typeahead, ArrowDown past the edge). Content
  scrolls to that row and records it as pending, and the row takes focus in the commit that mounts it.
  `WindowedTest` covers End/Home/ArrowUp across the whole 5,000 rows with fewer than 100 rows mounted.
- **`content-visibility: auto`** (`virtualize='css'`) mounts every row and only skips painting.

Measurements: `Benchmark` story, headless Chromium through the storybook vitest runner, 50 × 99 all open, `md`,
macOS. Mount is the time from `setState` to the next animation frame. Scroll is 60 frames of +400 px
`scrollTop`, one per `requestAnimationFrame`. Key is the mean of 10 `userEvent` ArrowDown presses, including
userEvent overhead.

| Mode     | Mount    | Scroll frame mean / p95 / max | ArrowDown |
| -------- | -------- | ----------------------------- | --------- |
| `window` | **66ms** | 16.7 / 16.8 / 16.8ms          | **12ms**  |
| `css`    | 949ms    | 16.7 / 16.7 / 16.8ms          | 215ms     |
| `none`   | 1204ms   | 16.7 / 16.8 / 16.8ms          | 230ms     |

A run taken before the row-layout fix in question 5 (rows were then three blocks tall) gave the same picture: 32ms,
1065ms and 1086ms to mount, and 13ms, 200ms and 209ms per key.

- Scrolling holds 60 fps in every mode in headless Chromium, which composites without real paint pressure, so this
  column does not separate the modes. A manual check on a real display is still owed.
- The deciding numbers are mount and per-key latency. **Without windowing every focus change re-renders all 5,000
  rows**, because each Ark part reads the one machine context and `getNodeState` runs per row, doing
  `expandedValue.includes`/`selectedValue.includes` (`@zag-js/tree-view/dist/tree-view.connect.mjs:39`). That is
  about 200 ms per ArrowDown. `content-visibility` saves paint, not this React work. So the Tree must window above a
  few hundred rows (AUDIT §6 point 3 recommendation 1 holds for Tree), or memoise rows on a per-node state selector.
- Scaling note: zag's `visibleNodes` and its `skip` function visit the whole collection and check each ancestor
  against `expandedValue` with `Array.includes`, per navigation event
  (`@zag-js/tree-view/dist/utils/visit-skip.mjs`). That is O(rows × depth × expanded). It is invisible at 5,000 rows
  with 50 open branches, but a tree with thousands of open branches would want zag to use a `Set` (upstream).

## 4. Drag and drop (pragmatic-dnd) on zag rows

The spike wires it on every row: `draggable` + `dropTargetForElements` with `attachInstruction` (tree-item hitbox,
`indentPerLevel` = one block, `currentLevel` = zag depth, `mode: 'expanded'` for open branches, make-child blocked
on leaves). It honours `canDrop`/`getDropKind` (`reject` becomes `instruction-blocked`), opens a closed branch after
a 500 ms hold, and a single Root `monitorForElements` scoped by `treeId` so a windowed row that scrolls out
mid-drag cannot lose the drop. Indicators: `Next.DropIndicator edge='top'|'bottom'` for reorder and reparent,
`data-drop='inside'` (an inset ring) for make-child.

- **No conflict with zag's focus or keyboard was found.** zag handles `keydown` on the tree element and `focus` on
  rows, and never touches drag events. pragmatic-dnd sets `draggable=true` on the `BranchControl`/`Item`, which keep
  their roving `tabindex`. `Test` asserts rows are `draggable` while the keyboard steps pass.
- Known interactions, both already handled in the current Tree: (a) a drop re-parents a row, which remounts it and
  drops DOM focus, so the tabstop must be restored through a controlled `focusedValue`. (b) Branch rows use
  `expandOnClick` (default `true` in the spike), which the current Tree turns off so that a click on the heading
  selects without toggling.
- **Not verified by automation**: synthetic drags do not drive pragmatic-dnd (see AUDIT §2.6). The drop was not
  exercised end to end in this spike. `Default` is draggable for a manual check.
- Gaps for Next: `DropIndicator` has only `top`/`bottom`. It needs `inside`, and an inline-start offset for
  `reparent` at a shallower level, which the current `TreeDropIndicator` draws.

## 5. Row layout on Container

Each row is a Container row: Ark's element with Container attributes (`nx-grid`, `data-layout='row'`,
`data-gutter='inherit'`, `data-columns`, `--nx-columns: block block minmax(0,1fr) auto`, for disclosure, icon, label,
trailing). It is indented by `padding-inline-start: depth × --nx-block-size`, the indent token, in `tree.css`. Padding
shifts every track, the `1fr` label absorbs it, and trailing cells stay aligned. Indent guides are one absolutely
placed segment per ancestor, centred under that ancestor's disclosure block, and they join across rows, which
also works windowed.

- **One block tall at every size: yes.** `Test` checks every row at `xs`–`xl` against its disclosure `Next.Block`.
- **Found a Container bug for trees:** Container's `@container (width < 24rem)` rule stacks a row's cells into one
  column (`.nx-grid[data-layout='row'] > :not([data-rail]) { grid-column: content }`, `theme/container.css`). A
  20 rem sidebar is under that threshold, so every row came out three blocks tall until `tree.css` opted out. Tree
  rows, and probably any navigation list, need an explicit opt-out from that query.
- The row cannot be `<Next.Container asChild>` around Ark's part, because Container's `data-scope`/`data-part` would
  win (finding 10). The spike copies the attributes by hand. `containerAttributes` should be exported through `Next`
  so wrappers in sibling packages can use it, as `Next.Listbox.Item` does.

## Animation

`Tree.Root` `animate` (default on) ports the current Tree's disclosure animation to flat rows. With no nested
`BranchContent` to animate, each row under the branch animates itself (`data-disclosure` on the row, keyframes in
`tree.css`):

- **Open** records the disclosure, then commits: the rows the commit mounts carry `data-disclosure='enter'` from their
  first frame and grow from zero to one block while fading in.
- **Close** records the disclosure and does not commit. zag still sees the branch as expanded (its `expandedValue` is
  the walk's), so the rows stay mounted with `data-disclosure='conceal'` and shrink to zero (`forwards` holds them
  there), the branch row carries `data-concealing` so its caret turns with them, and `aria-expanded` stays true. After
  the duration a timer commits `onOpenChange(false)` and the walk drops the rows; a close pending at unmount is
  committed then. The timer, not `animationend`, ends the phase, because a windowed tree may have none of the rows
  mounted.
- **User-driven only.** Only disclosures requested through the machine (or a drag hover) are recorded, so rows
  rendered open from the start never animate; no insertion-time gate is needed.
- **Duration** is `--nx-tree-disclosure-duration`, set on `.nx-tree` from the theme's `--duration-tree-disclosure` and
  `0ms` under `prefers-reduced-motion`; Root reads the resolved value, so CSS and timer agree, and 0 commits at once.
- Works in every `virtualize` mode; the window measures its block from a row that is not animating.
- `tree.css` (keyframes included) moves into the Next theme with the rest of the Tree's styles on adoption.

`Test` (enter and conceal, observed with a MutationObserver so a 200 ms phase is never missed), `OpenTest` (initial
open state does not animate) and `StaticTest` (`animate={false}`) cover it.

## 6. Recommendation and remaining work

**Adopt Ark tree-view (option 1)**, ported from the current Ark-based Tree rather than written fresh. Reasons: zag
already provides the full APG keymap and ARIA and is proven in production through the current Tree. The atom model
feeds it lazily without `loadChildren`. Its collection-driven navigation plus `scrollToIndexFn` makes windowing
straightforward. pragmatic-dnd coexists with it. Nothing found blocks it.

Remaining work, roughly **8–12 days**:

1. Port the lazy walk and flat rendering into the Tree, and move `tree.css` into the Next theme (1–2 d).
2. Row parts per part-naming rules 6–7: `Item` renders the default row from `itemProps` (icon, label, count); children
   compose from `ItemIcon`, `ItemText`, `ItemIndicator` (disclosure) and trailing controls. These replace
   `renderHeading`/`renderIcon`/`renderColumns`, and `gridTemplateColumns` becomes Root `columns`. Also group headers
   as `ItemGroup`/`ItemGroupLabel` (2–3 d).
3. Windowing: keep the focused row mounted when it scrolls out of the window. It is currently unmounted, which
   leaves focus on `body` and the tree with no tab stop. Also handle variable-height rows (a description line) by
   seeding `react-ui-virtual` with the block size (AUDIT §2.5) (2–3 d). Disclosure animation is done (see Animation).
4. Port the activation and selection details from question 2, and the drop details (`dropAtEnd`,
   `dropBelowExpanded`, drag-collapse of an open branch, focus restore, `DropIndicator` `inside`/indent) (2–3 d).
5. Migrate plugin-navtree and sdk/shell (32 call sites), plus a manual drag and scroll pass on a real display
   (1–2 d).

Blockers for option 1: none. The upstream `Array.includes` scan in zag's `skip`/`getNodeState` matters only for trees
with thousands of open branches, and windowing hides it at the scale measured here.
