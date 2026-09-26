# @dxos/react-ui-task

## 0.12.0

### Minor Changes

- f3f55a8: `Chat` holds its tasks directly: `taskSet: Ref<TaskSet>` is replaced by `tasks: Ref<Task>[]`. The type version goes `0.1.0` → `0.2.0` to mark the breaking field change; there is no data migration. The chat's `tasks` array is the membership-and-order record, exactly the shape `TaskSet.tasks` has, and `SetParent` on the field makes every task a child of the conversation that produced it.

  What this removes: the lazy task-set dance. `Chat.ensureTaskSet` / `ensureTaskSetSync` / `peekTaskSetRef` are gone, and with them the create-then-link race a conversation's first recorded task used to run. `Chat.addTask` / `Chat.deleteTask` are the shared write primitives (mirroring `TaskSet.addTask` / `deleteTask`), and `Chat.resolveTasks` is the non-Effect twin of `Chat.loadTasks`. `Chat.TaskList` reads `chat.tasks` directly, which closes its parent-walk TODO.

  Behaviour change: a project chat's checklist is now its own rather than the owning project's `TaskSet`, so a project's chats no longer share one ledger and delegated tasks no longer appear in the project's task list. `Project.taskSet` is unchanged and remains the project's durable ledger, written by the project verbs.

  **`@dxos/types` — the derived task views move from `TaskSet` to `Task`.** They always took a plain `readonly Task[]` and never touched a `TaskSet`; they lived in that module only because a task set used to be the sole container. With `Chat` as a second container the misplacement forced consumers to import a type they do not use, so `refEntityId`, `dedupeById`, `parentTaskId`, `orderTasks`, `rootTasks`, `subTasks`, `isTaskReady`, `effectiveMilestoneId(s)`, `tasksForMilestone`, `backlogTasks`, `milestoneProgress`, `collectSubtree` and `Progress` are now `Task.*`, joined by a new `Task.subtree` (every task transitively under one within a list — the synchronous counterpart of `collectSubtree`, cycle-safe, and what a delete has to sweep out of a membership array). `TaskSet` keeps what takes a task set: the schema, `make`, `instanceOf`, `addTask`, `deleteTask`, `resolveTasks`, `resolveMilestones`, and the membership and ordering helpers (`findTaskSet`, `addTaskToSet`, `removeTasksFromSet`, `reorder`, `resolveParentTask`, `applyParentTask`, …).

  Call sites update mechanically (`TaskSet.rootTasks` → `Task.rootTasks`, `TaskSet.refEntityId` → `Task.refEntityId`, and so on). `react-ui-task` and `plugin-tasks` follow the rename; `assistant-toolkit` and `plugin-assistant` now reference `TaskSet` nowhere at all.

- 2e4c299: A markdown field held open no longer paints an empty box before its editor arrives: the CodeMirror view is built in a layout effect, so a pane that switches subjects — a task's description beside its history — renders in one frame instead of dropping everything below the field by the editor's height a frame later.

  Five hand-rolled empty states (no task selected, no task set, no sessions, no message selected, no result selected) now use `Banner.Empty` from `@dxos/react-ui`, so an empty pane reads the same everywhere and announces itself as a status.

  `Empty` moves from `@dxos/react-ui-list` to `@dxos/react-ui` as `Banner.Empty`: it is the same statement a banner makes — a message in place of content — for the one case that carries no valence and paints no surface, and most of its callers are panes rather than lists. Every call site moves with it, and a package that depended on `react-ui-list` only to say "nothing selected" no longer does.

  A task's history records what happened to the work — status, priority, estimate, assignment — and no longer narrates edits to its text. A title or description is edited by typing and commits on every blur, so logging those filled the history with "Description updated." and buried the entries a reader opens it for. The text is still written; it is simply not narrated, and a caller with something to say about such an edit still says it through `options.description`.

  `Column.Section` joins `Column` in `@dxos/react-ui`: a labelled run of content that spans the column's three tracks and re-exposes them, so a heading and plain content sit in the content track while a `Column.Row` inside still reaches the gutters. It is what a detail pane is made of — headings, prose, and rows with a leading control.

  A task's detail pane is now one column rather than four blocks each choosing its own left edge, and the pieces it is made of are components a host can mount on its own. `TaskEditor` is a task's title and markdown description with nothing around them — no create case, no selection, and no list context — which is what `TaskArticle` now renders instead of the list's editing strip. `TaskProperties` renders status, assignee, priority and estimate as a labelled list, each a menu whose trigger shows the value beside its glyph; the assignee's picker offers the space's people. `TaskTags` is the row's chip set, wrapped into a flow beside `TaskMnemonic`, the chip that copies a task's `@mnemonic`. The three sections share one geometry — a fixed 24px glyph column — so a glyph sits on the same axis in each.

  A GitHub link pasted into a description is now a chip in the editor as well as at rest: `linkWidgets` claims the bare `URL` node a GFM autolink produces, not only `[label](url)`, and `plugin-github` names the chip from the URL — `#123`, or `owner/repo`. The same description used to read two ways depending on which surface showed it.

  **Breaking.** `TaskList.Edit` is `TaskList.Editor`, and it renders the fields only: a task's questions and its history belong to the surface with room to answer and to read, so `showQuestions` and `onQuestionAnswer` are gone from `TaskList.Root`, and rows no longer replay the log under their title. `TaskHistory` and `TaskQuestion` place themselves and no longer take `subgrid` or `cells` (a host previously threaded its own column names into each child). A host that answered questions through the list — plugin-assistant's chat — renders them itself now.

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
- e3d7a8c: Reading a task now works the way reading a message does: a row in a project's ledger opens the task beside the list rather than navigating over it.

  `useDetailNavigation` in `@dxos/app-toolkit/ui` is that gesture, stated once — it publishes the row as the list's selection, then shows the detail in a companion where the host contributes one and the viewport has room, as a plank at the host's deck level otherwise, and always in a plank of its own for a meta-click. The project ledger, the mailbox and the calendar share it; the project and the mailbox each gain a companion for it to fill, and `Calendar` declares the `calendar → event` chain its plank form needs. A `Task` article renders the detail, built from the list's own editor so a task reads and edits the same way wherever it is opened, and it shows the task's activity log under its description.

  Task lists also filter from a query editor in their toolbar — free text over title and description, `#tag` over the task's tags, and typed terms like `status:started` — in the standalone article and in the section a project embeds, which had no filter at all. A query that does not parse matches nothing rather than everything.

  Smaller fixes that travelled with it: a tree row keyboard focus lands on is painted with the current-item background rather than ringed; focus-following no longer selects on a meta-click, which opened a second plank; and restoring an editor's recorded scroll position is skipped for an editor that does not scroll itself, which was pulling its host form down by the editor's offset on every mount.

- 5dedae9: A task list's toolbar gains a status selector: a menu of checkboxes, one per status, choosing which statuses the list shows. Hiding a status hides the tasks filed under it too — a sub-task is part of the work its parent stands for — while the query beside it still keeps the ancestors of a match, so searching a narrowed list cannot bring a hidden branch back. Clearing the filter restores every status.

  Arrow keys move through a task list without selecting, and `Enter` opens the focused row. Selecting a task opens its detail, so following focus opened the detail of every row a reader passed on the way to the one they wanted.

  A `cardMasonry` surface renders a list of objects as cards — `plugin-space` implements it, and a host supplies what belongs in the grid rather than the surface deriving it from a subject. A task's companion uses it to show the task's artifacts beneath its editor. Cards also sit a step above the surface behind them (`--color-card-surface` moves to the raised level), so an unbordered card is legible against the plank it is on.

  A windowed tree fills its container again: the row window was positioned with `inline-start-0`/`inline-end-0`, utilities the Tailwind v4 migration dropped, so it had no insets and shrink-wrapped its rows to the width it first measured — a task list or navtree in a wide plank kept a narrow column of rows.

- 32584c9: `TaskList` renders its hierarchical mode as a `Tree`, so disclosure, roving focus and the WAI-ARIA keymap come from the tree machine rather than from hand-maintained `aria-level`/`posinset`/`setsize` on listbox options. The flat and grouped modes are unchanged.

  Drag and drop is restored on that path and gains the placements it never had: a drop onto a row makes the task its **first** child, the row's edges reorder around it, and a strip past the last row appends at the end. Arrow keys move focus with the highlight following; `Shift+Arrow` reorders and re-indents.

  `Tree` grows the options this needed, all off by default so `plugin-navtree` is unaffected: `leavesAcceptChildren` (a childless row can be dropped onto), `dropBelowExpanded` (an open branch offers "after this row and its subtree"), `dropAtEnd`, `selectionFollowsFocus`, `onKeyDown`, and `debug`, which paints every row's drop bands. `TogglePanel` is rebuilt on Ark's Collapsible — its parts and props are unchanged, and it gains a `caret` position and a `classNames` pass-through — and `ToolWidget` composes it with the accordion.

  **Breaking for stored data:** `Task.estimate` is a t-shirt size (`xs` | `s` | `m` | `l` | `xl`) rather than a bare number, annotated as a single-select like `Task.priority`. A size is what a reader can agree on without knowing a team's point scale. There is no migration in this change. `Task.Status` also gains `backlog`, `blocked` and `duplicate`. Linear sync maps between the vocabularies rather than dropping the field: points bucket into sizes inbound (`1→xs`, `2→s`, `3→m`, `5→l`, `8+→xl`) and each size pushes its bucket's representative value outbound, which is lossy in that direction by construction.

  `TaskList.Root` takes `showEstimates` to render the estimate beside the priority control, and the two description flags are reconciled into a single `showDescription`.

- 3ea8217: Questions an agent asks about a task now live in the task's history instead of in a separate
  `Question` object, which is removed. `Task.HistoryEntry` is a union keyed on `event` — `created`,
  `updated`, `question` and `answer`. Question and answer entries carry an `id`, so an answer names the question
  it answers by `questionId`; a change entry's `id` is optional, so history logged before ids still loads. `Task.ask`, `Task.answer`, `Task.getQuestions` and
  `Task.getPendingQuestions` read and write the exchange.

  `TaskList` renders each task's questions under its title (`showQuestions`, on by default) and answers
  them through `onQuestionAnswer`; the new `TaskQuestion` component draws one question. `AnswerQuestion`
  now takes the task and the question entry's id.

  `TaskOperation.AskQuestion` files a question on a task by its ref and blocks the task, with no chat
  needed, and the project skill lists it, so MCP clients get it as `tasks-ask-question` along with
  instructions on asking and reading the answer back. `TaskOperation.AnswerQuestion` records an
  answer; the task set view answers through it.

- af2b954: A task row now shows its questions one line each, with no answer controls. The full question (context, options, answer field) moves to `TaskList.Edit`, which shows the selected task's open questions on the pane's own columns and answers them through `onQuestionAnswer`. `TaskQuestion` gains `compact` for the one-line form, and `subgrid`/`cells` to lay out on a host's columns. Breaking: a host that answered questions in list rows must now render `TaskList.Edit` for the selected task.
- ff93962: `Tree` takes a `virtualize` prop, which mounts only the rows in view using `@dxos/react-ui-virtual`
  — the same windowing the trace timeline and the message feed use — and an optional `scrollerRef`
  naming the element that scrolls it. A task list turns it on, so a project's backlog renders the
  rows a reader can see rather than all of them. A tree with disclosable branches, or one that
  addresses an item at two paths, renders whole.

### Patch Changes

- b47fd84: A prompt in the assistant thread wears the reader's identity hue on its edge; clicking the selected commit in a `Timeline` clears the selection; the trace panel is an accordion of Processes, Trace and Details sections; the chat article's padding tightens and a task mnemonic copies with an `@` prefix.
- 178bc6d: The session timeline draws a task that no session's checklist holds as a lane of its own, spanned by its edit history, so tasks worked by an external harness (e.g. Claude Code) or by hand appear on the project pipeline chart. Task lanes (bar, nodes, thread and legend dot) and the task mnemonic chip share a hue hashed from the mnemonic, and the chip leads with the Task type's icon instead of a trailing clipboard glyph; `SystemIconButton.Clipboard` takes an optional `icon` for that idle glyph.
- 4a320bf: A task assigned to a coding agent now names it by its session's title (then its harness, then the
  actor's own fields) with the harness's icon, in both the list's assignee pill and `TaskProperties`,
  rather than a bare "Agent" beside a person glyph. The assignee picker lists a non-person assignee
  as the checked entry above the space's people.
- 6a1ec57: Add `Task.attachments`, files a task owns, with `Task.addAttachment`/`Task.removeAttachment` recording each change in the task's history, and the `tasks.addAttachment`/`tasks.removeAttachment` operations. Where plugin-file is installed, files dropped or pasted onto a task's article are stored and attached, with a placeholder card while each uploads and "Remove attachment" in the card's menu.

  `CardMasonry` (plugin-space) is now exported from `@dxos/plugin-space/components`, and `AppSurface.CardMasonryData` gains `size: 'compact'` (cards at three quarters, so a companion fits two columns), `inline` (in the host's flow rather than its own scroller), `pending` placeholder cards, and `CardMenu`, through which a host adds items to each card's menu. The `cardMasonry` surface now activates when requested on its own. A task's attachments and artifacts render through it.

  Image file cards fill the card; agent assignees use a robot glyph; tags centre their content.

  A task delegated to a chat is marked failed when the chat's model request fails, rather than staying started: `DelegationStrategy` gains an optional `onTurnFailed` hook, called when a turn fails (not when it is interrupted), and the supervisor fails the tasks the conversation holds, recording the error in the task's history. Delegating to a chat now names the chat as the assignee's `subject`, so the supervisor no longer mistakes the task for an orphaned sub-agent's; an agent standing for a non-session object reads as "Agent" rather than an id.

  A role-gated surface module (`AppCapability.surface` with `roles`) now logs an error when it loads if one of its surfaces binds a role it did not declare — the omission that left the `cardMasonry` surface unrendered wherever it was requested on its own.

- 0c92b44: `TaskList.Edit` gains `showDescription`, which edits a description under the title — the selected
  task's, or the new task's when creating, so a task can be added with one. The combobox trigger now
  collapses its caret column when a caller supplies its own children, which was painting a strip of
  trigger surface beside the field.
- b27fa26: `TaskList.Edit` saves the task when Cmd+Enter or Ctrl+Enter is pressed in the description editor, the same as the Save button; on an untitled create row the key does nothing. `@dxos/ui-editor` adds `submitOnModEnter`, a highest-precedence keymap that submits a multi-line field on Cmd/Ctrl+Enter.
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

- 4c5b2c7: `Timestamp` shows an instant in the room a column has — `now`, minutes to two hours, hours to a day, then a calendar date — and carries the full instant in a tooltip, since everything it shows is lossy by design.

  Minutes run past the hour because `90m` is a duration a reader feels where `1.5h` is one they compute. It counts live, scheduling each tick for the moment its value changes rather than on a fixed interval: a minute counter wakes once a minute, an hour counter once an hour, and a calendar date never wakes at all — a row that says `1m` ten minutes later is worse than no counter, because the reader believes it.

  A task's activity log renders its entries with it, in place of the "about 2 hours ago" that a log column has no width for.

- 714beb8: Task rows read their state more honestly: an unset estimate shows the same dot the priority control
  uses rather than an en dash, and the status glyph spins while an agent is actually working a task —
  assigned to one and started. Delegating a task to a chat now assigns it to that agent.

  A reasoning or synthetic block whose text fences anything in tags of its own is no longer truncated
  at the first tag, and its icon sits on the first line of the text rather than 2px below it.

  `@dxos/util` gains `concat` (a tagged template joining its lines with a space) and `lines` (the same
  dedent as `trim`, returning the lines unjoined).

- Updated dependencies [a92ea18]
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [6a457ac]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [f82c78f]
- Updated dependencies [9714c75]
- Updated dependencies [63fc847]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [f3f55a8]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [557e243]
- Updated dependencies [864cd0d]
- Updated dependencies [ea11703]
- Updated dependencies [cff33b7]
- Updated dependencies [9c86066]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [dcf911b]
- Updated dependencies [b83b831]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [5b99c47]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [c0e5651]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [cd4da46]
- Updated dependencies [ec4f4ca]
- Updated dependencies [d1a69fb]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [690dcaa]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [f4c2702]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [e3d7a8c]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [a3c10f1]
- Updated dependencies [32353e6]
- Updated dependencies [3ea8217]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [631df48]
- Updated dependencies [97efbaa]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [4ae2005]
- Updated dependencies [605455c]
- Updated dependencies [ff93962]
- Updated dependencies [9d8fcbd]
- Updated dependencies [85bdad2]
- Updated dependencies [b2a44d6]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
- Updated dependencies [eda8b55]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/types@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/react-ui-card@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-ui-markdown@0.12.0
  - @dxos/echo-react@0.12.0

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
