# @dxos/ui-theme

## 0.12.0

### Minor Changes

- e680b16: Add `dx-shrink`, and remove the `min-*-0` that a clip had already applied.

  `min-h-0` is widely read as "makes things scroll". It does not: it says the element may be **shorter than its content**, and without it a flex/grid item's minimum height is its content height, so it shoves its siblings out of the line. Measured in a 260px column above a 40px footer, the footer lands at 927px — outside the box — with nothing scrolling anywhere. Scrolling is only the consequence of finally being squeezed.

  `dx-shrink` (`min-h-0 min-w-0`) names that intent, and `dx-grow` becomes `flex-1 dx-shrink` so the two decisions — may I be small, do I claim the rest — compose rather than hiding inside one bundle.

  Also deletes 27 `min-*-0` that never did anything: a scroll container has already zeroed the same minimum, so a `min-h-0` beside `overflow-hidden`, `-auto` or `-scroll` is dead weight that reads as load-bearing. `overflow-clip` is excluded — it clips without scrolling, so the minimum still applies there. `prefer-sizing-utilities` now reports the redundant ones, and flags `dx-grow dx-fill` as the long spelling of `dx-expand`.

- a805212: Split the sizing utilities and remove `dx-container`.

  `dx-expander` is renamed `dx-expand` and decomposes into `dx-fill` (`h-full w-full`) and `dx-grow` (`flex-1 min-h-0 min-w-0`), so a class names how the parent sizes the element rather than bundling five properties. `dx-container` is removed: its `overflow-hidden` duplicated the `min-*-0` it already carried — any non-visible overflow zeroes a flex/grid item's automatic minimum size — and clipped everything as a side effect. Call sites that genuinely clip now say `overflow-hidden` explicitly. `dx-fullscreen` loses its `overflow-hidden` for the same reason.

  `withColumn.propagate()` selected on `.dx-container` to keep a ScrollArea's scrollbar in the gutter; that marker is now an explicit `dx-scroll-boundary` on `ScrollArea.Root`.

  Adds a `prefer-sizing-utilities` lint rule for the hand-rolled equivalents.

- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

### Patch Changes

- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.
- 928e0b2: Tree rebuilt on `@ark-ui/react` TreeView — full APG keyboard navigation (arrows, Home/End,
  typeahead, `*`), machine-managed focus and ARIA, atom-model walk into a controlled TreeCollection,
  pragmatic-drag-and-drop retained, animated disclose/conceal; `TreeItemHeading`/`TreeItemById` removed.
- Updated dependencies [d4b4919]
  - @dxos/ui-types@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- e65432c: Rework the light-mode surface ladder and control states.

  Surface levels, separators, wells, scrollbar thumbs and rail tones are now
  derived from the enclosing `--surface-bg` and attenuated for light mode through
  a single `--dx-attenuate-*` table, replacing several fixed neutrals that had
  drifted from the ladder. Filled controls derive their hover from their own fill
  (`--color-input-bg-hover`) rather than from the host surface, so hovering a
  default button no longer lightens it into the selected tone. `Panel.Toolbar`
  owns the toolbar bar treatment, so a nested `Toolbar.Root` matches content width
  without floating. Cards now carry their padding unconditionally.

- c58ebb7: Export design tokens as `@dxos/ui-theme/tokens.css`, so stylesheets compiled outside this repo — Composer plugins loaded from the registry — can generate token-backed utilities themselves rather than relying on whichever ones the host happens to bundle.

### Patch Changes

- 4df6cf3: Disable the Tailwind/Vite file watcher in `ThemePlugin` when running under Vitest. Its `server.watch` config was a non-null object that overrode the test runner's `watch: null`, keeping a live watcher whose per-file `fs_event` handles (registered by Tailwind's `@source` scan) were never released — hanging single-pass `vitest run` teardown so the process never exited. HMR-ignore patterns are retained for interactive `storybook dev` / `vite dev`.
- Updated dependencies [3f1fc67]
- Updated dependencies [f6a01e3]
  - @dxos/util@0.11.0
  - @dxos/log@0.11.0
  - @dxos/node-std@0.11.0
