# @dxos/plugin-assistant

## 0.12.0

### Minor Changes

- 375de88: The chat activity line now stays up for as long as the agent has something to report, instead of vanishing at the first streamed token — an agentic turn streams a little and then calls tools for a long time, where a cleared line reads as a finished request.

  `@dxos/assistant` adds three stages to `RequestPhase`: `sleeping`, which the agent emits when a turn ends with only a pending alarm keeping the process resident (without it the line keeps naming the stage that turn ended in); `calling-tool`, emitted before each tool call with the tool's name in `detail`, and `generating`, which the client derives from the arriving blocks — a trace write from inside the streaming pipeline adds a yield between parsing a block and submitting it, which is observable in what that turn's tools then see.

  `@dxos/plugin-assistant` moves `AiChatProcessor.activity` to `generating` on each streamed block rather than clearing it, and keeps it set until the turn settles, is cancelled, or fails. `Chat.Activity` renders the tool name as part of the sentence ("Calling tool search"), and — once a turn has settled or the agent reports `sleeping` — counts down to the self-wake ("Waking up in 25 seconds") from the chat's earliest pending alarm, ignoring a wake time already in the past. Any other running phase supersedes that line.

- 2cad6c0: The chat now says what a request is doing while the reader waits for the first token, instead of showing an unexplained pause.

  `@dxos/assistant` adds an ephemeral `RequestPhase` trace event (`assistant.requestPhase`) carrying the setup stage a turn has reached — `preparing`, `loading-history`, `summarizing`, `connecting-mcp`, `building-toolkit`, `encoding-prompt`, `contacting-provider` — plus a 1-based `attempt` so a request the provider makes us re-issue reads as a retry rather than a stall, and a free-form `detail` (the MCP server count, today). Emit one with `emitRequestPhase(phase, opts)`; it rides the existing ephemeral trace channel alongside `PartialBlock`, so it never reaches the durable feed. The `connecting-mcp` phase is skipped entirely when there are no servers, so a no-op stage never misreports where the wait is.

  `@dxos/plugin-assistant` exposes the latest phase on `AiChatProcessor.activity` and renders it as `Chat.Activity`, a line between the thread and the composer. It clears as soon as content streams in — the reply is the better progress report — and on the request settling, being cancelled, or failing. Mounted in the chat article, the chat dialog, and the assistant story chat.

- cd205fb: Add a `TurnProducer` seam to the agent process so an alternative engine can produce conversation turns: `AgentServiceOptions.makeTurnProducer` injects the producer (defaulting to the built-in `AiSession`), and the new `AssistantCapabilities.AgentTurnProducer` capability lets a plugin contribute one.
- b7d66c8: The `Chat` schema is no longer re-exported from the `@dxos/plugin-assistant/Assistant` namespace; import it from `@dxos/assistant-toolkit` instead. Plugin and UI packages also widen their `@dxos/react-ui` and `@dxos/ui-theme` peer-dependency ranges from an exact workspace pin to `workspace:^`, so consumers are no longer forced onto a single matching version.
- 09c1f56: Code mode for agent turns is now opt-in through the assistant's `codeMode` setting, off by default. The host supplies the engine through the new `codeModeTurnProducer` plugin option. A process picks its turn engine when it spawns, so toggling the setting affects agents started afterwards. A contributed `AgentTurnProducer` still takes precedence.

  Tool calls whose input or result is a record of long or multi-line strings, such as a code-mode `eval`'s `code` and `output`, now render as text rather than truncated single-line JSON.

- b8762ef: Chat context binding is now contributed through the `SubjectContext` capability: a chat opened against an object binds whatever every applicable provider derives from it, rather than a hardcoded set of cases. Project chats are ordinary companion chats — `ProjectOperation.CreateChat` is removed, and a project's instructions and skills reach its chat through a contributed provider. Adds `Skill.resolveAnnotatedSkills`, which resolves a type's declared skills across the registry and the space with a space copy (a fork) winning.
- f3f55a8: `Chat` holds its tasks directly: `taskSet: Ref<TaskSet>` is replaced by `tasks: Ref<Task>[]`. The type version goes `0.1.0` → `0.2.0` to mark the breaking field change; there is no data migration. The chat's `tasks` array is the membership-and-order record, exactly the shape `TaskSet.tasks` has, and `SetParent` on the field makes every task a child of the conversation that produced it.

  What this removes: the lazy task-set dance. `Chat.ensureTaskSet` / `ensureTaskSetSync` / `peekTaskSetRef` are gone, and with them the create-then-link race a conversation's first recorded task used to run. `Chat.addTask` / `Chat.deleteTask` are the shared write primitives (mirroring `TaskSet.addTask` / `deleteTask`), and `Chat.resolveTasks` is the non-Effect twin of `Chat.loadTasks`. `Chat.TaskList` reads `chat.tasks` directly, which closes its parent-walk TODO.

  Behaviour change: a project chat's checklist is now its own rather than the owning project's `TaskSet`, so a project's chats no longer share one ledger and delegated tasks no longer appear in the project's task list. `Project.taskSet` is unchanged and remains the project's durable ledger, written by the project verbs.

  **`@dxos/types` — the derived task views move from `TaskSet` to `Task`.** They always took a plain `readonly Task[]` and never touched a `TaskSet`; they lived in that module only because a task set used to be the sole container. With `Chat` as a second container the misplacement forced consumers to import a type they do not use, so `refEntityId`, `dedupeById`, `parentTaskId`, `orderTasks`, `rootTasks`, `subTasks`, `isTaskReady`, `effectiveMilestoneId(s)`, `tasksForMilestone`, `backlogTasks`, `milestoneProgress`, `collectSubtree` and `Progress` are now `Task.*`, joined by a new `Task.subtree` (every task transitively under one within a list — the synchronous counterpart of `collectSubtree`, cycle-safe, and what a delete has to sweep out of a membership array). `TaskSet` keeps what takes a task set: the schema, `make`, `instanceOf`, `addTask`, `deleteTask`, `resolveTasks`, `resolveMilestones`, and the membership and ordering helpers (`findTaskSet`, `addTaskToSet`, `removeTasksFromSet`, `reorder`, `resolveParentTask`, `applyParentTask`, …).

  Call sites update mechanically (`TaskSet.rootTasks` → `Task.rootTasks`, `TaskSet.refEntityId` → `Task.refEntityId`, and so on). `react-ui-task` and `plugin-tasks` follow the rename; `assistant-toolkit` and `plugin-assistant` now reference `TaskSet` nowhere at all.

- 4521dec: Every new chat now carries the planning skill, so a conversation can read and update the durable task checklist it already holds rather than answering task questions from nothing. `SetSessionCredentials` and `RevokeSessionCredentials` are replaced by a single `UpdateSessionCredentials` operation whose `refresh` mode re-reads every credential a running session already holds, so a rotated OAuth token no longer needs the session restarted — the two removed operations were also invisible to the model, since a `Schema.NonEmptyArray` input serialized to a JSON-schema keyword the tool resolver could not project. In the thread, a system-generated turn renders in its own framed panel again instead of as the model's own prose, and status and reasoning blocks fold into the tool run they narrate — including a run that never reaches a call — so a turn spent only narrating reads as one row rather than a widget per block.
- 88e3ebd: Add DeepSeek as a model provider served through EDGE.

  `Model.all` gains `deepseek-v4-flash` and `deepseek-v4-pro` under the edge provider. Because the
  edge provider now fronts more than one upstream, each resolver claims its own models by the
  developer authority in the id (`Model.developer`), so `AnthropicResolver` and the new
  `DeepSeekResolver` never serve each other's entries and the catalog entry needs no extra marker.

  DeepSeek speaks the OpenAI-compatible chat-completions dialect, so it reuses
  `ChatCompletionsAdapter` — which now understands `reasoning_content`, can request streamed usage
  via `stream_options.include_usage`, and accepts per-model request-body fields
  (`RequestOptions.body`) so the resolver can send DeepSeek's `thinking` parameter. V4 serves thinking
  and non-thinking mode from one model name, and thinking is on by default, so an explicit opt-out is
  sent when `thinking: false` is requested.

  Streamed responses now emit the `finish` part exactly once, after the source drains, carrying the
  last usage reported. Previously an OpenAI-format stream emitted a second, usage-less `finish` for
  the `data: [DONE]` sentinel that follows the `finish_reason` chunk, and usage arriving in a trailing
  `choices: []` chunk (as OpenAI itself reports it) was dropped.

  `EdgeHttpClient.anthropicAiRequest` is now `aiRequest(service, request)`, routing to
  `/ai/generate/<service>`; `EdgeAiHttpClient.layer` takes the service it should target. That request
  now uses `redirect: 'error'`, since its headers carry the EDGE credential and any BYOK key.

  `plugin-deepseek`'s `RunHarness` tool description named `deepseek-chat`, discontinued on
  2026-07-24; it now names the V4 ids. That string is read by a model choosing a value, so the stale
  example would have produced an id the provider rejects.

- 7d000b9: Added `Filter.hasParent(boolean)` for selecting objects by parent presence (indexed, reactive to `Obj.setParent`). Breaking: the `Chat.CompanionTo` relation is removed — companion and agent chats are now linked to their subject by the ECHO parent edge (`Obj.setParent`), and the standalone-chats query selects unparented chats directly.

  Companion chats are linked via `Chat.CompanionChatAnnotation` (refs stored on the subject object) plus the parent edge — `Chat.linkCompanion`; `Obj.setParent` now warns when the parent holds no ref to the child (to become an invariant). The `Err` module is renamed to `Error` (`@dxos/echo/Error`).

- 8c20ee2: The session gantt now separates a run's events by task.

  Both tools that move a task's status — the planning tool's `update-tasks` and `plugin-tasks`' `UpdateTask` — write a new `task.statusChanged` trace event. Nothing else in a trace says which task an agent was working on, so `buildSessionTimeline` reads those events to cut a session into one segment per task: the task lane gets a span of its own, nodes where it started and finished, and every marker inside the segment is attributed to it rather than piling onto the session bar.

  Only tasks on the session's own checklist take part in the cut, and a task that is only ever closed — delegation marks everything it hands over `started` before the agent's first turn — is cut from the previous boundary, but only on the transition out of `started`: a task merely dismissed claims nothing, and a second close (`review` → `done`) mints no segment overlapping the task then active. A delegated task is drawn as the child session that worked it, so its segment is dropped rather than moved onto a bar whose span does not contain those markers.

  The project's pipeline chart also draws its own lane names and per-lane totals: a ledger row is several lines tall and a chart row is one, so nothing lined up between them.

- 983fe1d: Removed the Agent Wizard skill. `AgentWizardSkill`, `AgentWizardHandlers` and `AgentWizardOperations` are gone from `@dxos/assistant-toolkit`, and the skill is no longer contributed or bound into new chats by `@dxos/plugin-assistant`.

  Its wizard-only tools (`org.dxos.operation.assistantToolkit.createAgent`, `org.dxos.operation.assistantToolkit.getAgentRules`) are removed with it — agent creation is now a UI action. `SyncAutomation` (`org.dxos.operation.assistantToolkit.syncTriggers`) is unchanged and keeps its key, but now lives in the agent skill: reach it via `AgentSkillOperations.SyncAutomation` and register `AgentSkillHandlers`.

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

### Patch Changes

- 4025ffe: Agent process state now lives in the session feed: queued prompts are Messages carrying a queued annotation, alarms are a new `Alarm` feed record (several may be pending at once), and both are managed with regular feed CRUD. A queue entry is marked consumed only after the turn it drove, so an interrupted turn is redelivered rather than lost. `SessionLoader` is renamed `SessionStore` and gains the read/write surface (`loadState`, `loadPending`, `enqueueMessage`, `ack`, `setAlarm`, `cancelAlarm`). The chat UI surfaces both: queued prompts stack above the composer and are cancellable, the next alarm shows in the status pill, and submitting during a running turn queues behind it instead of being dropped. Breaking: `SessionLoader` no longer exists, and the set-alarm operation no longer replaces the previous alarm.
- a1a22ee: Fix EDGE-configured hosts silently never using their edge client for invitation admission and agent creation, resync stale profile fields when an identity changes elsewhere, subscribe to previously-unwatched ECHO fields across several article surfaces, and replace several hand-rolled list/wrapper divs with the shared Listbox/Flex/Grid primitives.

  **Breaking:** several published namespace exports were renamed for consistency with the
  `import-as-namespace` convention (the `Foo`-prefix on a member of a `Foo` namespace was redundant).
  Pre-1.0, these ride a minor rather than a major:

  - `@dxos/assistant-toolkit`: `Memory` (was a namespace wrapping a `Memory` class; the root export is
    now the class itself)
  - `@dxos/compute`: `Trace.TraceWriter` → `Trace.Writer`
  - `@dxos/compute-runtime`: `ProcessManager.ProcessManagerImpl` → `ProcessManager.Impl`,
    `ProcessHandle.ProcessHandleImpl` → `ProcessHandle.Impl`
  - `@dxos/ai`: `ScriptedLanguageModel.scriptedLanguageModelLayer` → `ScriptedLanguageModel.layer`
  - `@dxos/sql-sqlite`: `OpfsWorker.OpfsWorkerConfig` → `OpfsWorker.Config`

  Consumers pinning these packages (e.g. `dxos/edge` via `pkg.pr.new`) need to update to the new names.

- 8363f12: Fix AI chat requests failing with `AiModelNotAvailableError`: the edge, local and bundled-sidecar model resolvers activated after the AI service had already snapshotted its resolver list. Ollama is now sent tool call arguments as an object, so the turn following a tool call is no longer rejected with HTTP 400. A model the configured provider does not serve is named in the chat's failure toast rather than reported as an unexpected error, and `@dxos/react-ui`'s translations are registered at startup so its primitives no longer render raw keys.
- cd6f37f: Chat now re-attaches to an agent that is still working when the view is remounted (e.g. navigating to another page mid-turn), so the running indicator and streamed output are no longer lost.
- a1075de: Assistant chat UI fixes. The outline rail lists one tick per prompt again — tool results travel back as user-role messages carrying a synthetic text block, so filtering on the role alone added a tick per tool call, titled from raw `<result>` markup, and cut each turn's range short at its first tool call. The thread gains a floating scroll-to-bottom button, which `useFollow` supports by publishing `atEnd` as state and `MessageList.Viewport` by taking an `overlay` slot. Suggestion chips are capped by the column they render in rather than the viewport, and are spaced by their own padding rather than a separator character that wrapped onto the next row. The chat options Skills and Objects lists sit flush to the popover edge, via ScrollArea knobs `SearchList.Viewport` now forwards. XML-tag widgets force a bounded parse on their first decoration build, so a remounted feed row does not show raw markup while the background parser catches up. A multi-step turn now renders as one tool panel rather than a card per call: the thread's projection folds each run of tool-only messages into one message (the runtime delivers one block per message), and the panel shows a row per call — naming the call in flight while the turn is live, then counting the run once it settles.
- 9fe88c8: Fixed two errors when opening the assistant companion: a momentary "Cannot read properties of null" flash while the chat was being provisioned (the companion now renders blank until it exists), and a "RovingFocusGroupItem must be used within RovingFocusGroup" crash when another plugin contributed a plain toolbar action to the prompt (the contributed items now render inside a toolbar context).
- b83d607: Chats that have not picked a model now default to Claude Sonnet 5 instead of the first catalog entry (Opus 5). Space-home starter prompts skip the model until a space has five recent objects, and reuse cached prompts while the set of recent objects is unchanged (up to a week), regenerating at most hourly otherwise.
- 15f952c: The chat's activity line ("Assembling tools", "Contacting inference provider", …) now sits above the counters pill rather than below it, so the sentence reads as a caption over the elapsed/token numbers. Both lines are composed by a new `Chat.StatusStack`.
- b47fd84: A prompt in the assistant thread wears the reader's identity hue on its edge; clicking the selected commit in a `Timeline` clears the selection; the trace panel is an accordion of Processes, Trace and Details sections; the chat article's padding tightens and a task mnemonic copies with an `@` prefix.
- ab734ba: A skill authored in a space can now be bound to a chat. Such a skill has no registry key, and the
  context binder dropped every keyless skill on the way in, so the picker's toggle did nothing at all:
  the row never ticked and the conversation never saw the skill.

  Keyless skills are now carried through the binder, and the picker addresses a skill by its object
  rather than re-looking it up by registry key — which is what silently no-oped. A space copy of a
  registry skill also now shadows the registry entry in the picker (it carries the user's edits, the
  same precedence `Skill.resolveAnnotatedSkills` already applies), and toggling it off clears either
  form from the conversation.

  `AgentService.createSession` likewise binds a skill that is already in a database as-is and
  references any other skill by its registry URI, instead of cloning it into the space through the
  deprecated `Skill.upsert` — which threw outright on a space-authored skill and would have
  substituted the pristine registry copy for a fork. Such a URI resolves through the database's own
  registry, so the assistant test layer now seeds a skill there as well as into `Registry.Service`.

- 51c7e91: Fix live sub-agent delegation: the `completeJob` tool schema is now sent to the provider verbatim (the structured-output transformer produced empty subschemas the Anthropic API rejects), and delegation failures post a concise message instead of a stack trace. Breaking: `Chat.outline` is replaced by `Chat.taskSet` — the conversation's working surface is a durable `TaskSet` (planning and delegation write `Task` objects; standalone chats delegate into their own set); the `Task.Status` literal `in-progress` is renamed `started` (named `Task.Priority`/`Task.Status` schemas are now exported); and `TaskList.Root` gains a `showGroupLabels` prop.
- abf082c: `Chat.Toolbar` takes an optional `switcher` naming the chats its history menu lists and what picking one does. The menu previously listed the companion chats of `companionTo` and switched the companion, with no way to scope it to anything else; omitting the prop keeps exactly that behaviour, so companion chats are unchanged.
- 45e7e4a: The `codeModeTurnProducer` plugin option is now a factory that receives the app's capability manager, so a host can build its code-mode sandbox from app services such as the client. Composer uses this to run code mode in a Web Worker on its own ECHO client instead of in the page; an operation the model's code invokes there receives the model's own objects, not JSON copies of them.
- 2fd4095: Compact the trace panel's process rows and label an agent row with the name of the chat it is serving.
- 81b5eb2: Inline chat prompts now report their completed flow back to the agent as a synthetic turn, so the conversation resumes instead of stalling on a click the agent cannot observe: connecting a service reports the connector and the new credential's URI once it is in the space, and enabling a plugin reports the plugin.
- 9477170: Stop a queued prompt appearing in both the queue and the transcript while the agent's turn runs.
- 7c426d4: Present operations that yield via `Operation.runAgain()` (`RunAgainError`) as a distinct "incomplete" state in the trace graph and routine run list, rather than a hard error, since the run will be re-invoked. The `operation.end` trace event now carries the failing error's `errorCode` so consumers can distinguish a run-again yield from a genuine failure.
- 5959b41: The project pipeline chart no longer burns CPU while it is closed.

  `ProjectArticle` mounted `ProjectPipeline` unconditionally inside the splitter's end panel and let `showPipeline` collapse it visually, so the chart kept rebuilding its whole timeline from the space's trace feed with nothing on screen. It is now mounted only while shown.

  `useSessionTimeline` additionally debounces the trace feed by 500ms, matching the debounce already applied to the process tree. `buildSessionTimeline` is not incremental — it re-flattens the full message history on every emission — and the feed emits per message, far faster than a reader can read. `useTraceMessages` takes the interval as a new optional `debounce` option; callers that omit it (such as `TracePanel`) are unchanged.

  `RtcTransportProxy` also no longer logs whole bridge events. A data event carries the packet as a `Uint8Array`, which the logger serialises as one JSON key per byte — 20MB across a few minutes of an idle session. It now logs the event's case and the payload's byte length.

  `SpaceProxy` no longer re-applies an unchanged automerge root. The host re-sends the space several times a second as its feeds advance, and the root is the same in nearly all of those updates; the redundant ones were walked down into the database only to be discarded there.

- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- 58b59d7: `Form.FieldSet` actions sit at the end of the heading row instead of overlapping the first field, and the Assistant, Debug, Script and Spaces settings panels now show the synced/local scope toggle.
- e3d7a8c: Reading a task now works the way reading a message does: a row in a project's ledger opens the task beside the list rather than navigating over it.

  `useDetailNavigation` in `@dxos/app-toolkit/ui` is that gesture, stated once — it publishes the row as the list's selection, then shows the detail in a companion where the host contributes one and the viewport has room, as a plank at the host's deck level otherwise, and always in a plank of its own for a meta-click. The project ledger, the mailbox and the calendar share it; the project and the mailbox each gain a companion for it to fill, and `Calendar` declares the `calendar → event` chain its plank form needs. A `Task` article renders the detail, built from the list's own editor so a task reads and edits the same way wherever it is opened, and it shows the task's activity log under its description.

  Task lists also filter from a query editor in their toolbar — free text over title and description, `#tag` over the task's tags, and typed terms like `status:started` — in the standalone article and in the section a project embeds, which had no filter at all. A query that does not parse matches nothing rather than everything.

  Smaller fixes that travelled with it: a tree row keyboard focus lands on is painted with the current-item background rather than ringed; focus-following no longer selects on a meta-click, which opened a second plank; and restoring an editor's recorded scroll position is skipped for an editor that does not scroll itself, which was pulling its host form down by the editor's offset on every mount.

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

- 12bf248: The trace panel mounts only while it is the selected sidebar companion, so a session that never opens it no longer loads the space's whole trace history. Production builds no longer subscribe to the full trace for the dev-only `dxosDumpTrace` console hatch.
- f112c37: New `@dxos/react-ui-trace`: the `Timeline` commit graph and `Gantt` (moved from `@dxos/react-ui-components`), the `ProcessTree`, a presentational `TracePanel`, and the pure builders behind them — `buildExecutionGraph` (span tree → commits) and `buildSessionTimeline` (sessions, tasks and sub-agents on a time axis, now over a `Session` input rather than a `Chat`). The agent trace events (`AgentRequestBegin/End`, `CompleteBlock`, `PartialBlock`, `DelegationSpawned`, `RequestPhase`, `McpServerError`) move from `@dxos/assistant` to `@dxos/compute` `Trace`, and `Process.isHarnessHost` identifies a conversation's agent process by its annotation, so the package depends on the compute layer only. `@dxos/react-ui-components` no longer depends on `@dxos/assistant`; the message-based `useExecutionGraph` hook is gone (its two consumers inline it). `@dxos/plugin-assistant` keeps the app-bound `TracePanel` container and `useSessionTimeline`, whose lanes now carry `sessionId` instead of `chatId`.

  TracePanel: processes are multi-selectable (click selects one, meta-click toggles; selection kept in view state) and the trace narrows to the selected processes and their children; each trace line shows a `HH:mm:ss` timestamp. `Tree` gains a `multiple` selection mode where a plain click selects a row alone and a meta-click toggles it (`onSelect` reports `meta`), and `createStaticTreeModel` an `isCurrent` seed. `Accordion.Root` gains `rounded`.

- Updated dependencies [a92ea18]
- Updated dependencies [0280a6a]
- Updated dependencies [375de88]
- Updated dependencies [9477170]
- Updated dependencies [0c6c186]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [62d755f]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [cd205fb]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [d2be597]
- Updated dependencies [6a457ac]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [96f94c2]
- Updated dependencies [c95def4]
- Updated dependencies [9477170]
- Updated dependencies [09c1f56]
- Updated dependencies [b83d607]
- Updated dependencies [b47fd84]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [f4e481a]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [c020513]
- Updated dependencies [592b00e]
- Updated dependencies [ab734ba]
- Updated dependencies [f82c78f]
- Updated dependencies [1a8043c]
- Updated dependencies [6d52561]
- Updated dependencies [520c34f]
- Updated dependencies [28b7621]
- Updated dependencies [9714c75]
- Updated dependencies [3b78bb6]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [5df602e]
- Updated dependencies [63fc847]
- Updated dependencies [4a0b78b]
- Updated dependencies [2d58ea5]
- Updated dependencies [34a8433]
- Updated dependencies [bd6ba8e]
- Updated dependencies [0fe00c5]
- Updated dependencies [28ad891]
- Updated dependencies [7560ca7]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [51c7e91]
- Updated dependencies [4521dec]
- Updated dependencies [b2d5bb2]
- Updated dependencies [3aa3d63]
- Updated dependencies [85ad256]
- Updated dependencies [2d4107f]
- Updated dependencies [c56ba34]
- Updated dependencies [ea4093c]
- Updated dependencies [069e8ed]
- Updated dependencies [7becabf]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [fee7666]
- Updated dependencies [fd23a8b]
- Updated dependencies [7d04444]
- Updated dependencies [194b1d3]
- Updated dependencies [d194929]
- Updated dependencies [6ef35a6]
- Updated dependencies [557e243]
- Updated dependencies [864cd0d]
- Updated dependencies [b4a84e6]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [cff33b7]
- Updated dependencies [5305365]
- Updated dependencies [c01fef6]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [5dc2419]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [938bd20]
- Updated dependencies [8a77160]
- Updated dependencies [dcf911b]
- Updated dependencies [881f900]
- Updated dependencies [b83b831]
- Updated dependencies [dd17e57]
- Updated dependencies [bb22f38]
- Updated dependencies [513cac6]
- Updated dependencies [6d28380]
- Updated dependencies [57d460a]
- Updated dependencies [6af89f4]
- Updated dependencies [329faa0]
- Updated dependencies [d770fe7]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [ab56cfe]
- Updated dependencies [7575cb6]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [2643a00]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [915db6a]
- Updated dependencies [020af54]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [ed43a8d]
- Updated dependencies [dde6714]
- Updated dependencies [9d4dec3]
- Updated dependencies [2e4c299]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [782a442]
- Updated dependencies [b02fe16]
- Updated dependencies [7b49616]
- Updated dependencies [f0d3620]
- Updated dependencies [4c52ca6]
- Updated dependencies [472ca95]
- Updated dependencies [5b99c47]
- Updated dependencies [181f374]
- Updated dependencies [49271cd]
- Updated dependencies [0426925]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [bd792a6]
- Updated dependencies [8608f03]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [84622b1]
- Updated dependencies [e5c13e4]
- Updated dependencies [26e31c1]
- Updated dependencies [8c20ee2]
- Updated dependencies [b9d72bb]
- Updated dependencies [9477170]
- Updated dependencies [eeff74c]
- Updated dependencies [279f87b]
- Updated dependencies [84568a0]
- Updated dependencies [251f586]
- Updated dependencies [3c85350]
- Updated dependencies [967b130]
- Updated dependencies [75d9c7c]
- Updated dependencies [0ef896f]
- Updated dependencies [d2f3d87]
- Updated dependencies [48fd9fe]
- Updated dependencies [d90fe83]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [6139557]
- Updated dependencies [5ceaf9c]
- Updated dependencies [48ea128]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [a74e9b0]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [490127e]
- Updated dependencies [851791f]
- Updated dependencies [9c86066]
- Updated dependencies [608a172]
- Updated dependencies [d535d55]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [5913020]
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [df0ab57]
- Updated dependencies [ce194c0]
- Updated dependencies [41e2750]
- Updated dependencies [818a096]
- Updated dependencies [043c792]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [9d2466a]
- Updated dependencies [0a7d273]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [b65d4fb]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [08cddf6]
- Updated dependencies [c0e5651]
- Updated dependencies [3214dcf]
- Updated dependencies [8efc4f1]
- Updated dependencies [47d48cd]
- Updated dependencies [df22dec]
- Updated dependencies [a283607]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [77a2d34]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [2bb84d8]
- Updated dependencies [d4b4919]
- Updated dependencies [770c73d]
- Updated dependencies [63e500b]
- Updated dependencies [9684ee8]
- Updated dependencies [b72c1a2]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [064a184]
- Updated dependencies [cd4da46]
- Updated dependencies [ec4f4ca]
- Updated dependencies [78e5596]
- Updated dependencies [5662dfc]
- Updated dependencies [d1a69fb]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [5959b41]
- Updated dependencies [2a41efd]
- Updated dependencies [72b7606]
- Updated dependencies [139a3b0]
- Updated dependencies [1b6e258]
- Updated dependencies [93c7523]
- Updated dependencies [4a71ef2]
- Updated dependencies [987f7e1]
- Updated dependencies [e7fc023]
- Updated dependencies [a09e18e]
- Updated dependencies [142ba02]
- Updated dependencies [1ab4bb8]
- Updated dependencies [e1ee9dd]
- Updated dependencies [b8ed8b0]
- Updated dependencies [8610d9d]
- Updated dependencies [fc8c80c]
- Updated dependencies [a5dfa5e]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [22c7a70]
- Updated dependencies [08c82f9]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [8f372ce]
- Updated dependencies [6c881a2]
- Updated dependencies [f048062]
- Updated dependencies [690dcaa]
- Updated dependencies [3b09a05]
- Updated dependencies [14c2fab]
- Updated dependencies [89f2811]
- Updated dependencies [092f3be]
- Updated dependencies [74f9b30]
- Updated dependencies [b7822a7]
- Updated dependencies [cc9b81f]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [4cb12a9]
- Updated dependencies [c4188a6]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [89bca65]
- Updated dependencies [0b1dcbd]
- Updated dependencies [a53cabb]
- Updated dependencies [eab5509]
- Updated dependencies [d7b0a3b]
- Updated dependencies [20e86ba]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [16e0588]
- Updated dependencies [983fe1d]
- Updated dependencies [af1ff99]
- Updated dependencies [2513a52]
- Updated dependencies [fa79a0e]
- Updated dependencies [5a00dcb]
- Updated dependencies [d7bec53]
- Updated dependencies [17ed864]
- Updated dependencies [1d6f730]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [10defed]
- Updated dependencies [9996125]
- Updated dependencies [0280a6a]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [dea5df9]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9ffccd5]
- Updated dependencies [fc83abd]
- Updated dependencies [9a3f01e]
- Updated dependencies [7276d38]
- Updated dependencies [178bc6d]
- Updated dependencies [58b59d7]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [66e5008]
- Updated dependencies [ff45e97]
- Updated dependencies [dd039d2]
- Updated dependencies [6fed038]
- Updated dependencies [adcad97]
- Updated dependencies [77d0026]
- Updated dependencies [97b247c]
- Updated dependencies [e288833]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [886453b]
- Updated dependencies [baa40a1]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [582fc22]
- Updated dependencies [892b718]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [4a320bf]
- Updated dependencies [6a1ec57]
- Updated dependencies [66f381d]
- Updated dependencies [a357f0c]
- Updated dependencies [1957b39]
- Updated dependencies [e3d7a8c]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [b27fa26]
- Updated dependencies [72b2984]
- Updated dependencies [5dedae9]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [8bf7f0f]
- Updated dependencies [2e8ec6f]
- Updated dependencies [3ea8217]
- Updated dependencies [af2b954]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [631df48]
- Updated dependencies [97efbaa]
- Updated dependencies [b767bc1]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [9986e16]
- Updated dependencies [211ae8e]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [a20d4d9]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [4ae2005]
- Updated dependencies [605455c]
- Updated dependencies [ff93962]
- Updated dependencies [9d8fcbd]
- Updated dependencies [e64e2b5]
- Updated dependencies [85bdad2]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [b2a44d6]
- Updated dependencies [a1d42c4]
- Updated dependencies [714beb8]
- Updated dependencies [077cd58]
- Updated dependencies [77d0026]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [78433b0]
- Updated dependencies [77976e4]
- Updated dependencies [e0a9adb]
- Updated dependencies [f99a6e9]
- Updated dependencies [eda8b55]
- Updated dependencies [11de244]
- Updated dependencies [79d5ecf]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/assistant@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/agent-runtime@0.12.0
  - @dxos/client@0.12.0
  - @dxos/plugin-markdown@0.12.0
  - @dxos/plugin-registry@0.12.0
  - @dxos/plugin-space@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/assistant-toolkit@0.12.0
  - @dxos/react-ui-assistant@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/react-ui-task@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/plugin-deck@0.12.0
  - @dxos/link@0.12.0
  - @dxos/config@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/plugin-tasks@0.12.0
  - @dxos/types@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/plugin-connector@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/devtools@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/react-ui-trace@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/plugin-routine@0.12.0
  - @dxos/log@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/react-ui-transcription@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/mcp-client@0.12.0
  - @dxos/plugin-transcription@0.12.0
  - @dxos/react-ui-feed@0.12.0
  - @dxos/react-ui-chat@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/react-hooks@0.12.0
  - @dxos/conductor@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-client@0.12.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/plugin-status-bar@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/halo-react@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/react-list@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/agent-runtime@0.11.1
- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-graph@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/assistant@0.11.1
- @dxos/assistant-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/client@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/conductor@0.11.1
- @dxos/devtools@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/halo@0.11.1
- @dxos/halo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/link@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-list@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-chat@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-editor@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-graph@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-markdown@0.11.1
- @dxos/react-ui-masonry@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/react-ui-syntax-highlighter@0.11.1
- @dxos/react-ui-tabs@0.11.1
- @dxos/react-ui-transcription@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-attention@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-connector@0.11.1
- @dxos/plugin-deck@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-map@0.11.1
- @dxos/plugin-markdown@0.11.1
- @dxos/plugin-routine@0.11.1
- @dxos/plugin-space@0.11.1
- @dxos/plugin-status-bar@0.11.1
- @dxos/plugin-table@0.11.1
- @dxos/plugin-transcription@0.11.1

## 0.11.0

### Minor Changes

- f9ba47a: Agents become identity/presets (breaking, no data migration — 0.1.0 agents must be recreated): `Agent` 0.2.0 keeps only name, DID, enabled, and a typed `Instructions` ref; a chat and the agent it runs as are linked by the `CompanionTo` relation (resolved with `AgentChat.loadAgent` / `AgentChat.loadChat`), neither type referencing the other by field; durable artifacts belong to a Project collection; subscriptions and cron schedules compile to Routines whose relay qualifies events with a cheap model and forwards them onto the durable agent session.
- b5ecf54: Chats carry a typed `instructions` ref rendered into the system prompt at request time (replacing typename-based inlining of bound Instructions objects, which now bind as ordinary context objects), and the new Project skill lets the assistant file created objects into a project's artifacts collection and list them.
- 801b77f: Add a `Minimap` component (`@dxos/react-ui-components`): a vertical rail of ticks representing anchor markers in a scrollable document, with a wave hover animation, per-marker popover, and brighter ticks for the currently-visible range.

  `MarkdownStreamController` gains `scrollTo`, `getVisibleRange`, and `onVisibleRangeChange`. In `plugin-assistant` the chat thread now renders a `Chat.Minimap` rail (one tick per prompt turn, scrolls to the turn on click), and prompt prev/next navigation steps through the prompt range table rather than the xml-tag widget bookmarks.

### Patch Changes

- a256a87: Reorganize CodeMirror extensions into themed folders (`core`, `state`, `behavior`, `decoration`, `language`, `collab`, `completion`, `streaming`, `structure`, `demo`, `debug`) with per-folder barrels; the package's public export set is preserved. Fixes the misspelled exported type `CompoetionContext` → `CompletionContext`, de-duplicates `escapeRegExpSource` into `util` (closing a latent tag-escaping bug in `extendedMarkdown`'s mixed parser), and adds an `xmlTags` characterization test suite. `xmlTags` block widgets now keep their portal alive across viewport culls (removing the blank/flicker on scroll-back for known-height embeds). `@dxos/ui`: adds a `string` overload to `Domino.of` for custom-element tags (e.g. `dx-icon`); `@dxos/plugin-assistant` drops the now-unneeded `Domino.of(... as any)` casts.
- c9da903: Move the `useFlush` hook from `@dxos/plugin-assistant/hooks` to `@dxos/react-client/echo`. It operates on a `Space`, so it belongs with the other space hooks; import it from `@dxos/react-client/echo` instead of `@dxos/plugin-assistant/hooks`.
- bdf9f68: Add routed scripts to the scripted test language model (per-session cursors for supervisor/sub-agent scenarios) and restore per-message span publishing from the chat thread (minimap markers and prompt navigation).
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [5585ec8]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [c3625d3]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [31fe0b8]
- Updated dependencies [46ec569]
- Updated dependencies [53fde97]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [eec72c5]
- Updated dependencies [bce1dbc]
- Updated dependencies [e7f0d9e]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [1a9bca1]
- Updated dependencies [68e61ca]
- Updated dependencies [ed992c2]
- Updated dependencies [ebb6383]
- Updated dependencies [bf013a1]
- Updated dependencies [a83d98a]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [dd190a0]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [77fff35]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [c58ebb7]
- Updated dependencies [d547045]
- Updated dependencies [b602d44]
- Updated dependencies [6439417]
- Updated dependencies [277e365]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [2543b63]
- Updated dependencies [1dad41e]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [0d1f866]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [9ded6b9]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [1a989ed]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [59a65a8]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [cec59a4]
- Updated dependencies [717edc0]
- Updated dependencies [cd3ed11]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [a83d98a]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [25272e3]
- Updated dependencies [0e3a1a9]
- Updated dependencies [105dac4]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [31fe0b8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/plugin-markdown@0.11.0
  - @dxos/app-graph@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/plugin-connector@0.11.0
  - @dxos/plugin-routine@0.11.0
  - @dxos/link@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/client@0.11.0
  - @dxos/plugin-deck@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-ui-masonry@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/react-ui-markdown@0.11.0
  - @dxos/assistant-toolkit@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-ui-tabs@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/agent-runtime@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/conductor@0.11.0
  - @dxos/devtools@0.11.0
  - @dxos/plugin-map@0.11.0
  - @dxos/plugin-status-bar@0.11.0
  - @dxos/plugin-table@0.11.0
  - @dxos/plugin-transcription@0.11.0
  - @dxos/react-ui-chat@0.11.0
  - @dxos/react-ui-transcription@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/react-ui-graph@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/react-list@0.11.0
  - @dxos/invariant@0.11.0
