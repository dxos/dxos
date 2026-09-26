# @dxos/react-ui-list

## 0.12.0

### Minor Changes

- 864cd0d: A combobox popover could not be dismissed. `Combobox.Content` stamped its own `id` on the popover content, overwriting the one the popover machine assigns and uses to find that element, so the machine had no layer to test an interaction against and an outside click was never recognised. The content no longer sets an id, and the trigger no longer overrides `aria-expanded`, `aria-controls` or `aria-haspopup` — the popover trigger already supplies all three, naming the content it actually rendered. The trigger also forced the popover open on every click, which made a second click a no-op depending on handler order; it now lets the trigger toggle.

  Breaking: `Combobox.Arrow` is removed. The arrow was a caller-supplied child, so it landed inside `Combobox.Content`'s scrolling viewport rather than beside it, positioned against the wrong box and painted under the viewport's surface. `Combobox.Content` now renders it, so drop `<Combobox.Arrow />` from call sites.

  The preview plugin's JSON fallback card top-aligns its disclosure toggle instead of floating it at the middle of an expanded dump, and renders the payload through `Syntax.*` so it scrolls in a `ScrollArea` with the themed scrollbar rather than the platform's own.

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
- 605455c: `Tree` rows treat cursor, selection and collapse as one gesture each.

  The pointer now belongs to rows a click selects, rather than to every row: a row that can only be
  dragged takes the open hand, and a draggable row shows `grabbing` for the press that starts the
  drag. Selection no longer discloses — a branch that `canSelect` refuses discloses on click (it
  previously did nothing), and a selectable one only ever selects, with the chevron, `Space` and
  option-click still disclosing either way.

  A selected row could not be re-selected: the row reported the flip of its own state, deselecting it,
  and the machine selected it again on the same click. Re-activation now reports the row as staying
  current, matching `Enter`, and `selectNode`'s `current` argument is required — the flipping default
  also read a machine event for an already-current row as a deselect. Single selection still has no
  deselect-by-click gesture.

  A collapse commits on the gesture instead of waiting out its animation, and the conceal rides the
  machine's own `data-state`. The chevron, the model and the machine no longer disagree for the
  length of the animation, and a click arriving mid-collapse reopens the branch rather than being
  swallowed.

  In the navtree, a graph node with no data is reported as unselectable, matching the select handler,
  which already ignored it: synthetic sections such as the Collections row now disclose on click and
  offer no pointer.

- ff93962: `Tree` takes a `virtualize` prop, which mounts only the rows in view using `@dxos/react-ui-virtual`
  — the same windowing the trace timeline and the message feed use — and an optional `scrollerRef`
  naming the element that scrolls it. A task list turns it on, so a project's backlog renders the
  rows a reader can see rather than all of them. A tree with disclosable branches, or one that
  addresses an item at two paths, renders whole.
- 9d8fcbd: A windowed `Tree` now windows trees with branches too: an open branch's children mount as rows after their parent, so hierarchical task lists and the process tree mount only the rows in view. Keyboard navigation reaches rows outside the window, and the tree keeps its "drop after the last row" target. Breaking: `useWindow` from `@dxos/react-ui-virtual` now identifies each mounted row by `data-window-id` instead of `data-object-id`, so a host that renders its own rows must spread the new `windowRowProps(index, id)` onto each one.

### Patch Changes

- c0e5651: Restore drag and drop in the navtree. A tree item's `treeId`, the scope a pragmatic-dnd monitor claims its own drags by, was the tree's own `id`. That holds only when a monitor serves exactly one `Tree`; the navtree mounts one per workspace tab, so its rows carried a per-tab id, the monitor watching for the graph root claimed nothing, and reordering a collection and dropping an object into one both silently did nothing.

  The scope is now the root of the tree's path, so trees sharing a path root are one drag scope. Both existing monitors were already written against that value and are unchanged.

  A drop target now also rejects sources from another tree. A monitor scoping the drags it claims is only half of it: rows and the append strip accepted any source, so a navtree row dropped on a task list was read by the navtree's monitor as a graph node.

- e3d7a8c: Reading a task now works the way reading a message does: a row in a project's ledger opens the task beside the list rather than navigating over it.

  `useDetailNavigation` in `@dxos/app-toolkit/ui` is that gesture, stated once — it publishes the row as the list's selection, then shows the detail in a companion where the host contributes one and the viewport has room, as a plank at the host's deck level otherwise, and always in a plank of its own for a meta-click. The project ledger, the mailbox and the calendar share it; the project and the mailbox each gain a companion for it to fill, and `Calendar` declares the `calendar → event` chain its plank form needs. A `Task` article renders the detail, built from the list's own editor so a task reads and edits the same way wherever it is opened, and it shows the task's activity log under its description.

  Task lists also filter from a query editor in their toolbar — free text over title and description, `#tag` over the task's tags, and typed terms like `status:started` — in the standalone article and in the section a project embeds, which had no filter at all. A query that does not parse matches nothing rather than everything.

  Smaller fixes that travelled with it: a tree row keyboard focus lands on is painted with the current-item background rather than ringed; focus-following no longer selects on a meta-click, which opened a second plank; and restoring an editor's recorded scroll position is skipped for an editor that does not scroll itself, which was pulling its host form down by the editor's offset on every mount.

- 0c92b44: `TaskList.Edit` gains `showDescription`, which edits a description under the title — the selected
  task's, or the new task's when creating, so a task can be added with one. The combobox trigger now
  collapses its caret column when a caller supplies its own children, which was painting a strip of
  trigger surface beside the field.
- 5dedae9: A task list's toolbar gains a status selector: a menu of checkboxes, one per status, choosing which statuses the list shows. Hiding a status hides the tasks filed under it too — a sub-task is part of the work its parent stands for — while the query beside it still keeps the ancestors of a match, so searching a narrowed list cannot bring a hidden branch back. Clearing the filter restores every status.

  Arrow keys move through a task list without selecting, and `Enter` opens the focused row. Selecting a task opens its detail, so following focus opened the detail of every row a reader passed on the way to the one they wanted.

  A `cardMasonry` surface renders a list of objects as cards — `plugin-space` implements it, and a host supplies what belongs in the grid rather than the surface deriving it from a subject. A task's companion uses it to show the task's artifacts beneath its editor. Cards also sit a step above the surface behind them (`--color-card-surface` moves to the raised level), so an unbordered card is legible against the plank it is on.

  A windowed tree fills its container again: the row window was positioned with `inline-start-0`/`inline-end-0`, utilities the Tailwind v4 migration dropped, so it had no insets and shrink-wrapped its rows to the width it first measured — a task list or navtree in a wide plank kept a narrow column of rows.

- 631df48: A task's ID chip copies the task's full `echo://<space>/<id>` URI rather than `@mnemonic`, so the copied reference resolves wherever it is pasted; in the task list it reads the space from the live task rather than the row's snapshot.

  The terminal prints JSON — an object, or a string holding a JSON object or array — indented and highlighted, with keys, strings, numbers, booleans and null colored through the theme's ANSI palette.

  The terminal leaves a blank line after a command's output, and selected text is readable: the selection took a color token that does not exist, which resolved to the text color.

  The task list's filter button is filled and accented whenever anything narrows the list — a typed query as well as hidden statuses — so a filtered list is recognisable at a glance.

  In the task list a task's tags and artifacts sit on a line of their own under the title and above the description, instead of sharing the title line; the assignee stays right-aligned on the title line. `TaskTags` takes `assignee={false}` for a host that places the assignee itself.

  A task row's menu offers **Add sub-task**, which files an untitled task under that row, expands the row if it was collapsed, and opens the new task. A task editor focuses its title when the task has none, so the new task is named where it opens; an untitled row shows an "Untitled" placeholder.

  An answered question appears in the task's activity as one entry, the question with its answer, dated when it was answered; open questions stay in the article's Questions section, where each option is an item of its own. `TaskHistory` no longer takes `onAnswer`, and `TaskQuestion` no longer takes `date`.

  The task list's create pane takes files dropped or pasted on it (`TaskList.Editor` `acceptFiles`), holding them as chips until the task is created and then handing them to `onTaskCreate` with the draft. `onTaskCreate` may report a `TaskCreateResult`: `error` keeps the whole draft (a refused create no longer clears what was typed), `rejectedFiles` stay on the pane to retry, and a create that lands late clears only fields still holding what was sent; the task set article offers it only where a plugin can store files, and attaches them to the new task.

  In a hierarchical task list `Tab` indents the focused task under its previous sibling and `Shift+Tab` outdents it to follow its parent, alongside the existing `Shift+Arrow` moves; `Tab` is left to move focus when there is nothing to indent under or focus is on a control inside the row.

  The task set's filter — the query text and the statuses shown — is kept per device and per set (`TaskSetView.aspect`, the view-state `local` backend), so it survives navigating away and reloading.

  A tree row keeps focus after a key the consumer handles on it (e.g. a restructuring `Shift+Arrow` or `Tab` in the task list), so consecutive moves work without refocusing the row.

  `.dx-tag` no longer carries a margin, so chips are spaced only by their container's `gap` and tags and tag-styled buttons line up evenly; containers that relied on the margin (select cells in the grid, chat references, plugin list tags, devtools tree, card rows) now own a gap, and tags inline in CodeMirror text and the transcript gutter keep a local `mx-0.5`.

  Which branches of a task set's list are open is kept per device and per set, as a task id → open map on `TaskSetView.aspect`, so a collapsed branch stays collapsed across navigation; a task absent from the map is open, as before.

- 1a3de22: Fix the command palette and search dialog keyboard contract. Both now focus their input on open
  (so Enter runs the highlighted entry instead of the dialog's Close button), keep the first result
  highlighted as the query changes, and close on Escape rather than only clearing the query.
  `Picker.Input`/`SearchList.Input` gain `escapeBehavior`, `SearchList.Root` gains
  `resetSelectionOnChange`, and `resolveKeyBinding` in `@dxos/util` applies the platform fallbacks
  everywhere a shortcut hint is rendered — shortcuts were blank on Linux despite firing.
- f112c37: New `@dxos/react-ui-trace`: the `Timeline` commit graph and `Gantt` (moved from `@dxos/react-ui-components`), the `ProcessTree`, a presentational `TracePanel`, and the pure builders behind them — `buildExecutionGraph` (span tree → commits) and `buildSessionTimeline` (sessions, tasks and sub-agents on a time axis, now over a `Session` input rather than a `Chat`). The agent trace events (`AgentRequestBegin/End`, `CompleteBlock`, `PartialBlock`, `DelegationSpawned`, `RequestPhase`, `McpServerError`) move from `@dxos/assistant` to `@dxos/compute` `Trace`, and `Process.isHarnessHost` identifies a conversation's agent process by its annotation, so the package depends on the compute layer only. `@dxos/react-ui-components` no longer depends on `@dxos/assistant`; the message-based `useExecutionGraph` hook is gone (its two consumers inline it). `@dxos/plugin-assistant` keeps the app-bound `TracePanel` container and `useSessionTimeline`, whose lanes now carry `sessionId` instead of `chatId`.

  TracePanel: processes are multi-selectable (click selects one, meta-click toggles; selection kept in view state) and the trace narrows to the selected processes and their children; each trace line shows a `HH:mm:ss` timestamp. `Tree` gains a `multiple` selection mode where a plain click selects a row alone and a meta-click toggles it (`onSelect` reports `meta`), and `createStaticTreeModel` an `isCurrent` seed. `Accordion.Root` gains `rounded`.

- 520c34f: A tree branch no longer clips its first and last rows at rest. The branch content carried `overflow-y: clip` permanently for the disclose/conceal height animation, which cut the 2px focus ring off any control on a branch's first or last row (visible as a ring with a flat top in the task list). The clip now rides in the `tree-disclose`/`tree-conceal` keyframes, so it applies only while the height is moving.
- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [a1075de]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [813069c]
- Updated dependencies [8cb5553]
- Updated dependencies [098a0bb]
- Updated dependencies [818a096]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [07531e0]
- Updated dependencies [d4b4919]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [4cb12a9]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [56276cd]
- Updated dependencies [6a1ec57]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/react-ui-virtual@0.12.0
  - @dxos/react-focus@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/react-list@0.12.0

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
