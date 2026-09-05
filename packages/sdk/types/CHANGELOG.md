# @dxos/types

## 0.12.0

### Minor Changes

- f3f55a8: `Chat` holds its tasks directly: `taskSet: Ref<TaskSet>` is replaced by `tasks: Ref<Task>[]`. The type version goes `0.1.0` → `0.2.0` to mark the breaking field change; there is no data migration. The chat's `tasks` array is the membership-and-order record, exactly the shape `TaskSet.tasks` has, and `SetParent` on the field makes every task a child of the conversation that produced it.

  What this removes: the lazy task-set dance. `Chat.ensureTaskSet` / `ensureTaskSetSync` / `peekTaskSetRef` are gone, and with them the create-then-link race a conversation's first recorded task used to run. `Chat.addTask` / `Chat.deleteTask` are the shared write primitives (mirroring `TaskSet.addTask` / `deleteTask`), and `Chat.resolveTasks` is the non-Effect twin of `Chat.loadTasks`. `Chat.TaskList` reads `chat.tasks` directly, which closes its parent-walk TODO.

  Behaviour change: a project chat's checklist is now its own rather than the owning project's `TaskSet`, so a project's chats no longer share one ledger and delegated tasks no longer appear in the project's task list. `Project.taskSet` is unchanged and remains the project's durable ledger, written by the project verbs.

  **`@dxos/types` — the derived task views move from `TaskSet` to `Task`.** They always took a plain `readonly Task[]` and never touched a `TaskSet`; they lived in that module only because a task set used to be the sole container. With `Chat` as a second container the misplacement forced consumers to import a type they do not use, so `refEntityId`, `dedupeById`, `parentTaskId`, `orderTasks`, `rootTasks`, `subTasks`, `isTaskReady`, `effectiveMilestoneId(s)`, `tasksForMilestone`, `backlogTasks`, `milestoneProgress`, `collectSubtree` and `Progress` are now `Task.*`, joined by a new `Task.subtree` (every task transitively under one within a list — the synchronous counterpart of `collectSubtree`, cycle-safe, and what a delete has to sweep out of a membership array). `TaskSet` keeps what takes a task set: the schema, `make`, `instanceOf`, `addTask`, `deleteTask`, `resolveTasks`, `resolveMilestones`, and the membership and ordering helpers (`findTaskSet`, `addTaskToSet`, `removeTasksFromSet`, `reorder`, `resolveParentTask`, `applyParentTask`, …).

  Call sites update mechanically (`TaskSet.rootTasks` → `Task.rootTasks`, `TaskSet.refEntityId` → `Task.refEntityId`, and so on). `react-ui-task` and `plugin-tasks` follow the rename; `assistant-toolkit` and `plugin-assistant` now reference `TaskSet` nowhere at all.

- cd4da46: Magazine feed sync now runs in dev builds without a hidden toggle, curation tolerates the `null` fields agents emit instead of discarding the run, and re-curating no longer duplicates posts or exceeds the magazine's keep bound. Outlines gain a read-only presentation mode, promotion into an embedding object's task set, and a convert action that is disabled once an item is already a link; projects own an outline from creation and expose their artifacts as a navtree branch. A surface whose plugin is still loading no longer flashes an unrelated catch-all surface first. Removes the unused `DevFlag` helpers from `@dxos/util` and the `height`/`padding` options from the outliner menu.
- f962a7d: Add a `Repo` type (a host-agnostic source repository, with provenance carried by foreign keys) and `Project.repo` naming the repository a project's work lands in. `#123` in markdown now decorates as a link to the issue or pull request, contributed by `@dxos/plugin-github` and resolved against the owning project's repository, then the repository its task set mirrors, then the single repository a space mirrors; a space with none or several leaves the text alone. The outline accepts host-contributed editor extensions so a plugin's decoration can reach it, and `hashtag()` no longer claims a bare number.

  The task list renders a task's description as markdown on its own row, marks the selected row, keeps its create row on screen, and reveals the delete affordance on hover or keyboard focus only. `Popover.Arrow` renders again: the popover content clipped its own overflow, and Radix positions the arrow as a child of that content straddling its edge, so clipping moved to `Popover.Viewport`.

- d8e9de1: Dragging a task in a task set now lands where it was dropped instead of snapping back to its old
  position for about a second first.

  Two things held it up. The drop invoked the `MoveTask` verb, whose handler resolves the owning set
  and validates the parent through index-backed queries before it writes, and in the browser each of
  those is a worker round trip. And the article subscribed to membership and array order only, so a
  re-parent — which changes neither — reflowed the tree only once the query happened to re-emit after
  indexing.

  `TaskSet.moveTask` is the verb's write half, extracted and synchronous: reposition in the array,
  re-parent when asked. `TaskSetArticle` applies it against objects the list already holds, and the
  verb keeps its validation and calls the same helper, so a gesture and an agent call cannot write
  different things. Validating the placement is the caller's job either way — `resolveParentTask` in
  the verb, the rendered tree in the list. Drag and the `Alt`+arrow / `Tab` moves no longer pass
  through the operation invoker as a result, so they no longer appear in operation history;
  `MoveTask` has no undo mapping, so no undo behavior changes.

  The article's task list now derives from one atom over the set's `tasks` array and every member's
  `parentTask`, which also fixes a remote peer's re-parent waiting on the index.

- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

- 97efbaa: Task-set membership is now the ECHO parent edge: `Annotation.SetParent` on the set's `tasks`/`milestones` arrays parents every member to the set, `Task.parentTask` stays an app-level relationship, and the task list and outline link labels enumerate via `Filter.childOf(taskSet)` instead of resolving the ref array. Array order stays canonical, applied via the new `TaskSet.orderTasks`; deleting a task sweeps its subtree explicitly in the delete verb. The membership APIs (`findTaskSet`, `addTaskToSet`, `loadSetTasks`, `collectSubtree`, `removeTasksFromSet`, `reorder`, `resolveParentTask`, `applyParentTask`, `refEntityId`) move from plugin-tasks internals into the `TaskSet` namespace.

### Patch Changes

- 12b6618: Mailbox scan cascade. `ScanMailbox` spawns the mailbox pipelines in cost order —
  deterministic extraction (contacts, subscriptions), then cheap LLM classification, then per-message
  summarization — surfaced as a Scan action on the mailbox and a `scanMailbox` routine template.
  Summaries are stored as immutable annotations on a second mailbox feed (`Mailbox.annotations`,
  `ContentBlock` disposition `summary`) and merged into the message article on read. Tracking projects
  now take a `scope` and a `pipeline`, choosing which operation their routine binds.
- 4a10672: New `useOperationHandler(operation, map?)` hook: suspensefully resolves an operation's handler as an effect fn (`(input) => Effect<Output>`), or — with `map` — as a callback-args binding (`(...args) => Effect<Output>`). The component suspends while the handler's module lazy-loads; a miss throws `NoHandlerError`. Resolution goes through the new `Capabilities.OperationHandlers` singleton — the merged reactive handler set the process manager already builds for the operation invoker, now also contributed as a capability. `OperationHandlerSet.reactive` memoizes `getHandlerFor` promises per key (invalidated when contributions change) so React's `use` can resume suspended renders, and `OperationHandlerSet.findHandler(set, definition)` is the definition-typed promise counterpart of `getHandler`.

  `useSpaceCallback` now passes the returned callback's arguments through to `fn`, so gesture handlers can build effects from per-call inputs. BREAKING: the optimistic-overlay layer is removed entirely — `useOptimisticOperation`, `OptimisticBinding`, `useOptimisticQuery`, and the `@dxos/app-framework/Optimistic` module. Local-first sync writes need no overlay; a query view is a memoized `Atom.make` over `query.atom` read with `useAtomValue`.

  New `Ref.peek()` / `Database.peek(ref)` — the target when already materialized: the pinned target or a side-effect-free working-set lookup; never throws, never triggers loading. `Ref.target` is deprecated in its favor (it loads and registers a resolution callback as side effects, and can throw). Compose `Database.peek(ref) ?? (yield* Database.load(ref))` for a sync-when-materialized read with an async fallback — an effect built only from materialized refs runs under `Effect.runSync`. `Database.load` itself is unchanged — its async resolution also settles a just-added object into its own document, which flows like branching depend on. `TaskSet.resolveParentTask` uses that composition, and its cycle check walks the candidate's `parentTask` ancestor chain (equivalent to the old subtree collection, and it sees cross-set descendants) instead of querying.

  BREAKING: `TaskOperation.MoveTask`'s input requires a `taskSet` ref alongside the task and its handler needs no services. With loaded refs the whole operation completes without an async boundary — a drop runs it with `Effect.runSync` so the write lands in the gesture frame, with no optimistic overlay — while unloaded refs (e.g. an agent caller) load asynchronously through the same path.

- ee180f6: `useOperation(operation, map, options?)` in `@dxos/app-framework/ui`: binds an operation to a UI callback in one step — `map` turns the component's callback arguments into the operation input, and the returned handler keeps a stable identity across renders (the mapper and options are read through refs). `Optimistic.make(source)` in `@dxos/app-framework` overlays ordered optimistic entries on a reactive row-source atom (apply entries retire on the first source emission after the operation settles and auto-revert on failure; retain entries pin rows evicted from a filtered source through a grace window), and `useOptimisticOperation` binds an operation dispatch to such an overlay. `TaskSet.reorderItems` in `@dxos/types` generalizes `TaskSet.reorder` over any keyed list so optimistic transforms share the handler's ordering.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [592b00e]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [b125655]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/link@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/random@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/client-protocol@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/invariant@0.11.1
- @dxos/link@0.11.1
- @dxos/log@0.11.1
- @dxos/random@0.11.1
- @dxos/schema@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 37c17cc: Project model unification, phase 1 (breaking, no data migration — nothing deployed). Two forms of work: markdown checklists (`Outline`) are the cheap, fluid form; ECHO `Task` objects in a `TaskSet` are the durable, assignable form; promotion links the two. `ExternalProject` becomes `TaskSet` (`org.dxos.type.taskSet@0.2.0`); containment is the ECHO parent edge (`TaskSet → Task → sub-Task`), replacing the `Task.project` ref. `Task` 0.2.0 renames `assigned: Ref<Person>` to `assignee: Actor` (human by Person ref/email/name, agent by DID) and adds `failed`/`cancelled` statuses. `Outline` moves into `@dxos/types` (0.2.0) with checklist markdown helpers and the task-promotion helpers. `Project` 0.3.0 adds `goals`, `outline`, and `taskSet`. The `Plan` type is REMOVED: a conversation's working set is its outline (`Chat.outline`; project chats write the project's outline) plus promoted Tasks; the planning skill edits checklist markdown, and delegation promotes to a durable agent-assigned Task the supervisor reconciles over.
- f0ec728: Promote `Topic` to a first-class domain type. `Topic` moves from `@dxos/pipeline-email` to `@dxos/types` as a Project-style class (inline title/label/icon annotations + `make` factory), keeping a shared `Topic.Props` struct and its `org.dxos.type.topic` DXN. The Topic detail view (`TopicArticle`) moves to `@dxos/plugin-brain` and renders via a regular object/article surface.

  Breaking: `Topic` / `TopicProps` are no longer exported from `@dxos/pipeline-email` — import from `@dxos/types` and use the namespace form (`Topic.Topic`, `Topic.Props`). No compatibility re-export is left behind.

- a49131a: Introduce `@dxos/link`, a low-level infrastructure package holding a unified `Cursor` ECHO type (`org.dxos.type.cursor` 0.2.0), the relocated `AccessToken` type, and the durable-progress sync machinery. `Cursor` replaces `@dxos/plugin-connector`'s `SyncBinding` relation with a flat object whose discriminated `spec` covers both external-source sync (Gmail, Trello, GitHub, Linear, Slack, Discord, Bluesky) and internal feed-to-feed processing (e.g. mailbox fact extraction), so progress now persists across reloads for both. `Connection`/`Connector` stay in `@dxos/plugin-connector` and correlate to a `Cursor` via their shared `AccessToken` rather than a direct relation. This is a breaking change: existing `SyncBinding` relations and `Cursor` 0.1.0 objects are not migrated and are abandoned on upgrade — external syncs re-bind and feed-to-feed analysis restarts from the beginning.

### Patch Changes

- 6d2afe0: Move `DraftMessage` out of `@dxos/plugin-inbox` into `@dxos/types`, and move the generic email-sync pipeline stages (excluding the `SyncBinding`-coupled `toCommitUnit`) out of `@dxos/plugin-inbox` into `@dxos/pipeline-email`, so these can be reused without depending on a full app-framework plugin. `Connection` and `SyncBinding` remain in `@dxos/plugin-connector`; `toCommitUnit` and `factsCommit` (both coupled to `SyncBinding`) live in `@dxos/plugin-inbox`.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [48d168e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a83d98a]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [2543b63]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/link@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/log@0.11.0
  - @dxos/random@0.11.0
  - @dxos/invariant@0.11.0
