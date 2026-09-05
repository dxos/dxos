# @dxos/react-ui-list

## 0.12.0

### Minor Changes

- 29543ca: MOSAIC ui-template groundwork across the UI packages.

  - `Grid` layout primitive: track lists (`cols={['min-content', '1fr']}`), `subgrid`, `gap` from the spacing ramp, `align`/`center`, `contents`, and `asChild`.
  - `Show`/`Switch` conditional-rendering primitives: `<Show when fallback>` renders its children (or a render prop receiving the narrowed value) while `when` is present — anything except `undefined`/`null`/`false` — and `<Switch.Root on fallback>` renders the first `<Switch.Match when>` whose `when` strictly equals (or, as a predicate, matches) `on`. Both are DOM-free and mirror the ui-template `show`/`fallback`/`switch`/`match` grammar.
  - `Combobox`: the popover aligns exactly with its trigger (trigger-width content, zero collision padding), the trigger reuses the `Select` trigger slot and the placeholder role, and single-select lists emit one selection per press.
  - `Listbox`: visible row focus ring, `onDeselect` (Escape clears only a non-empty selection), and a `multiselectable` mode for externally-managed selection with option navigation.
  - `TaskList.Root`'s `onTaskCreate` now receives a `TaskDraft` (`{ title, ...optional patch fields }`) instead of a bare title, so a description (or priority/assignee) can be supplied when available.

- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

- 928e0b2: Tree rebuilt on `@ark-ui/react` TreeView — full APG keyboard navigation (arrows, Home/End,
  typeahead, `*`), machine-managed focus and ARIA, atom-model walk into a controlled TreeCollection,
  pragmatic-drag-and-drop retained, animated disclose/conceal; `TreeItemHeading`/`TreeItemById` removed.
- 4ae2005: Lay every `Tree` row out on one grid the consumer templates: the disclosure toggle is the template's first track (omit it with `toggle={false}` for a flat list), the heading's cells and columns render straight into the row, and each row indents by padding its own grid so nested rows shift as a block. **Breaking:** a `gridTemplateColumns` passed to `Tree` must now begin with the toggle track. The task list builds its template from its options — gutter, status, title, chips, estimate, priority, actions — with every fixed cell one rail-item square and no column gap, and no longer reserves a gutter for a drag handle.

### Patch Changes

- c0e5651: Restore drag and drop in the navtree. A tree item's `treeId`, the scope a pragmatic-dnd monitor claims its own drags by, was the tree's own `id`. That holds only when a monitor serves exactly one `Tree`; the navtree mounts one per workspace tab, so its rows carried a per-tab id, the monitor watching for the graph root claimed nothing, and reordering a collection and dropping an object into one both silently did nothing.

  The scope is now the root of the tree's path, so trees sharing a path root are one drag scope. Both existing monitors were already written against that value and are unchanged.

  A drop target now also rejects sources from another tree. A monitor scoping the drags it claims is only half of it: rows and the append strip accepted any source, so a navtree row dropped on a task list was read by the navtree's monitor as a graph node.

- 0c92b44: `TaskList.Edit` gains `showDescription`, which edits a description under the title — the selected
  task's, or the new task's when creating, so a task can be added with one. The combobox trigger now
  collapses its caret column when a caller supplies its own children, which was painting a strip of
  trigger surface beside the field.
- Updated dependencies [96f94c2]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [098a0bb]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [d4b4919]
- Updated dependencies [0a3e9dd]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [32584c9]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
  - @dxos/react-ui@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-list@0.12.0
  - @dxos/debug@0.12.0

## 0.11.1

### Patch Changes

- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/react-list@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 9da013f: New package `@dxos/echo-panproto`: declarative, JSON-serializable lenses (`Panproto.Lens`) between ECHO objects and foreign wire records, executed by a runner (`Panproto.encode`/`decode`) rather than expressed as closures.

  Annotation-driven publishing of ECHO objects to the AT Protocol. `@dxos/schema` gains `AtprotoRecordAnnotation` (type-level: target collection, record-key strategy, and a declarative serializable lens) and `AtprotoVisibilityAnnotation` (field-level, private by default — a field is published only when explicitly marked), so a generic companion can discover and publish any annotated type without knowing the type itself.

  `MasterDetail` moves from plugin-routine into `@dxos/react-ui-list` as a reusable primitive: a selectable master list above a detail slot, nestable by placing another `MasterDetail` in `detail`. Per-row overflow menus are driven by `useMenuBuilder` from `@dxos/react-ui-menu`.

  `ComboboxField` now shows the selected option's label rather than the stored value, which is often an opaque id the user never chose to see.

### Patch Changes

- 277e365: HeyGen avatar/voice pickers now list only the account's own assets (`/v3/avatars?ownership=private`, `/v3/voices?type=private`) instead of HeyGen's public catalog, with names trimmed (HeyGen returns user-named assets with leading newlines / non-breaking spaces) and sorted alphabetically; list requests are bounded by a timeout so a slow response can't hang the picker. `Listbox.ItemContent` no longer reserves the leading icon column when no `icon` is set, so icon-less rows are flush to the edge instead of indented.
- 2a68c3b: The conversation view (`MessageArticle`) now renders threads as a Mosaic stack: each message is a tile with its own toolbar, so Reply/Reply All/Forward/AI reply/Delete act on that specific message rather than always targeting the newest one. Body view controls (view mode, load remote images) and collapse-all/expand-all move to a single thread toolbar that applies to the whole conversation, and each message can be individually collapsed to a compact summary. The per-message `Message.Toolbar` no longer includes the view-mode switcher or load-images toggle.

  By default only the most recent message is expanded and the rest are collapsed. Replying to a message now records the specific message it answers (`parentMessage`), so the draft renders directly after that message in the thread rather than always at the bottom, and it is smoothly scrolled fully into view.

  `Listbox.Item` rows with an `onClick` (not just selectable ones) are now keyboard-focusable and respond to Enter/Space, matching native `<button>` activation.

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [686fac1]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/react-list@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
