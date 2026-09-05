# @dxos/react-ui-task

## 0.12.0

### Minor Changes

- f3f55a8: `Chat` holds its tasks directly: `taskSet: Ref<TaskSet>` is replaced by `tasks: Ref<Task>[]`. The type version goes `0.1.0` → `0.2.0` to mark the breaking field change; there is no data migration. The chat's `tasks` array is the membership-and-order record, exactly the shape `TaskSet.tasks` has, and `SetParent` on the field makes every task a child of the conversation that produced it.

  What this removes: the lazy task-set dance. `Chat.ensureTaskSet` / `ensureTaskSetSync` / `peekTaskSetRef` are gone, and with them the create-then-link race a conversation's first recorded task used to run. `Chat.addTask` / `Chat.deleteTask` are the shared write primitives (mirroring `TaskSet.addTask` / `deleteTask`), and `Chat.resolveTasks` is the non-Effect twin of `Chat.loadTasks`. `Chat.TaskList` reads `chat.tasks` directly, which closes its parent-walk TODO.

  Behaviour change: a project chat's checklist is now its own rather than the owning project's `TaskSet`, so a project's chats no longer share one ledger and delegated tasks no longer appear in the project's task list. `Project.taskSet` is unchanged and remains the project's durable ledger, written by the project verbs.

  **`@dxos/types` — the derived task views move from `TaskSet` to `Task`.** They always took a plain `readonly Task[]` and never touched a `TaskSet`; they lived in that module only because a task set used to be the sole container. With `Chat` as a second container the misplacement forced consumers to import a type they do not use, so `refEntityId`, `dedupeById`, `parentTaskId`, `orderTasks`, `rootTasks`, `subTasks`, `isTaskReady`, `effectiveMilestoneId(s)`, `tasksForMilestone`, `backlogTasks`, `milestoneProgress`, `collectSubtree` and `Progress` are now `Task.*`, joined by a new `Task.subtree` (every task transitively under one within a list — the synchronous counterpart of `collectSubtree`, cycle-safe, and what a delete has to sweep out of a membership array). `TaskSet` keeps what takes a task set: the schema, `make`, `instanceOf`, `addTask`, `deleteTask`, `resolveTasks`, `resolveMilestones`, and the membership and ordering helpers (`findTaskSet`, `addTaskToSet`, `removeTasksFromSet`, `reorder`, `resolveParentTask`, `applyParentTask`, …).

  Call sites update mechanically (`TaskSet.rootTasks` → `Task.rootTasks`, `TaskSet.refEntityId` → `Task.refEntityId`, and so on). `react-ui-task` and `plugin-tasks` follow the rename; `assistant-toolkit` and `plugin-assistant` now reference `TaskSet` nowhere at all.

- 29543ca: MOSAIC ui-template groundwork across the UI packages.

  - `Grid` layout primitive: track lists (`cols={['min-content', '1fr']}`), `subgrid`, `gap` from the spacing ramp, `align`/`center`, `contents`, and `asChild`.
  - `Show`/`Switch` conditional-rendering primitives: `<Show when fallback>` renders its children (or a render prop receiving the narrowed value) while `when` is present — anything except `undefined`/`null`/`false` — and `<Switch.Root on fallback>` renders the first `<Switch.Match when>` whose `when` strictly equals (or, as a predicate, matches) `on`. Both are DOM-free and mirror the ui-template `show`/`fallback`/`switch`/`match` grammar.
  - `Combobox`: the popover aligns exactly with its trigger (trigger-width content, zero collision padding), the trigger reuses the `Select` trigger slot and the placeholder role, and single-select lists emit one selection per press.
  - `Listbox`: visible row focus ring, `onDeselect` (Escape clears only a non-empty selection), and a `multiselectable` mode for externally-managed selection with option navigation.
  - `TaskList.Root`'s `onTaskCreate` now receives a `TaskDraft` (`{ title, ...optional patch fields }`) instead of a bare title, so a description (or priority/assignee) can be supplied when available.

- 66f381d: `TaskList` rows can render a selection checkbox in the gutter where the ordinal sits, driven by a new
  `checked`/`onTaskCheck` pair the host owns; a project's task list keys that set in view state and its
  toolbar assigns every checked task to one agent chat. `ProjectOperation.DelegateTaskToChat` now takes
  an ordered `tasks` list instead of a single `task`.
- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

### Patch Changes

- 0c92b44: `TaskList.Edit` gains `showDescription`, which edits a description under the title — the selected
  task's, or the new task's when creating, so a task can be added with one. The combobox trigger now
  collapses its caret column when a caller supplies its own children, which was painting a strip of
  trigger surface beside the field.
- 714beb8: Task rows read their state more honestly: an unset estimate shows the same dot the priority control
  uses rather than an en dash, and the status glyph spins while an agent is actually working a task —
  assigned to one and started. Delegating a task to a chat now assigns it to that agent.

  A reasoning or synthetic block whose text fences anything in tags of its own is no longer truncated
  at the first tag, and its icon sits on the first line of the text rather than 2px below it.

  `@dxos/util` gains `concat` (a tagged template joining its lines with a space) and `lines` (the same
  dedent as `trim`, returning the lines unjoined).

- Updated dependencies [96f94c2]
- Updated dependencies [f3f55a8]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [813069c]
- Updated dependencies [098a0bb]
- Updated dependencies [12b6618]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [c0e5651]
- Updated dependencies [d4b4919]
- Updated dependencies [cd4da46]
- Updated dependencies [0a3e9dd]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [f962a7d]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [32584c9]
- Updated dependencies [97efbaa]
- Updated dependencies [928e0b2]
- Updated dependencies [f9816c0]
- Updated dependencies [4ae2005]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
  - @dxos/react-ui@0.12.0
  - @dxos/types@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-ui-markdown@0.12.0

## 0.11.1

### Patch Changes

- @dxos/echo@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/ui-types@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [277e365]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
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
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/echo-react@0.11.0
