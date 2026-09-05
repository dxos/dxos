# @dxos/assistant-toolkit

## 0.12.0

### Minor Changes

- 9477170: Added an `assign-tasks` tool to the planning skill. It takes `add` and `remove` arrays of references to tasks that already exist and mutates the conversation's checklist accordingly, so an agent can pick up a task owned elsewhere (a project's task set, another conversation) or drop one it is no longer working on. Membership only — unlike `update-tasks` it never creates or edits a task, and removing one does not delete it.

  `Chat.assignTasks` / `Chat.unassignTasks` back the tool and are exported for direct use.

- f3f55a8: `Chat` holds its tasks directly: `taskSet: Ref<TaskSet>` is replaced by `tasks: Ref<Task>[]`. The type version goes `0.1.0` → `0.2.0` to mark the breaking field change; there is no data migration. The chat's `tasks` array is the membership-and-order record, exactly the shape `TaskSet.tasks` has, and `SetParent` on the field makes every task a child of the conversation that produced it.

  What this removes: the lazy task-set dance. `Chat.ensureTaskSet` / `ensureTaskSetSync` / `peekTaskSetRef` are gone, and with them the create-then-link race a conversation's first recorded task used to run. `Chat.addTask` / `Chat.deleteTask` are the shared write primitives (mirroring `TaskSet.addTask` / `deleteTask`), and `Chat.resolveTasks` is the non-Effect twin of `Chat.loadTasks`. `Chat.TaskList` reads `chat.tasks` directly, which closes its parent-walk TODO.

  Behaviour change: a project chat's checklist is now its own rather than the owning project's `TaskSet`, so a project's chats no longer share one ledger and delegated tasks no longer appear in the project's task list. `Project.taskSet` is unchanged and remains the project's durable ledger, written by the project verbs.

  **`@dxos/types` — the derived task views move from `TaskSet` to `Task`.** They always took a plain `readonly Task[]` and never touched a `TaskSet`; they lived in that module only because a task set used to be the sole container. With `Chat` as a second container the misplacement forced consumers to import a type they do not use, so `refEntityId`, `dedupeById`, `parentTaskId`, `orderTasks`, `rootTasks`, `subTasks`, `isTaskReady`, `effectiveMilestoneId(s)`, `tasksForMilestone`, `backlogTasks`, `milestoneProgress`, `collectSubtree` and `Progress` are now `Task.*`, joined by a new `Task.subtree` (every task transitively under one within a list — the synchronous counterpart of `collectSubtree`, cycle-safe, and what a delete has to sweep out of a membership array). `TaskSet` keeps what takes a task set: the schema, `make`, `instanceOf`, `addTask`, `deleteTask`, `resolveTasks`, `resolveMilestones`, and the membership and ordering helpers (`findTaskSet`, `addTaskToSet`, `removeTasksFromSet`, `reorder`, `resolveParentTask`, `applyParentTask`, …).

  Call sites update mechanically (`TaskSet.rootTasks` → `Task.rootTasks`, `TaskSet.refEntityId` → `Task.refEntityId`, and so on). `react-ui-task` and `plugin-tasks` follow the rename; `assistant-toolkit` and `plugin-assistant` now reference `TaskSet` nowhere at all.

- 51c7e91: Fix live sub-agent delegation: the `completeJob` tool schema is now sent to the provider verbatim (the structured-output transformer produced empty subschemas the Anthropic API rejects), and delegation failures post a concise message instead of a stack trace. Breaking: `Chat.outline` is replaced by `Chat.taskSet` — the conversation's working surface is a durable `TaskSet` (planning and delegation write `Task` objects; standalone chats delegate into their own set); the `Task.Status` literal `in-progress` is renamed `started` (named `Task.Priority`/`Task.Status` schemas are now exported); and `TaskList.Root` gains a `showGroupLabels` prop.
- 8a77160: The database skill's `schema-list` tool now returns lightweight summaries (typename, kind, name, description, fields) by default instead of the full JSON Schema for every type; pass `typenames` to fetch the full JSON Schema for specific types.
- 63e500b: Space object CRUD is now projected from operations, and space operations no longer reach for app
  plugins to do it.

  `addObject`, `getObject`, `updateObject`, `removeObjects` and `queryObjects` are MCP-projected
  operations, so a remote agent reads and writes space objects through the same verbs the app uses.
  `addObject` takes one `object` field that is a union of a live entity and a `{ "@type", ...props }`
  description, so the schema itself admits exactly one form rather than two optional fields policed by
  a handler check; `removeObjects` accepts references alongside live entities,
  and space operations no longer require a capability manager they never use — both so a host without
  the app's UI capabilities can still invoke them.

  Observability events are registered rather than emitted. A plugin contributes an
  `ObservabilityMapping` — the operation, the event name, and how to derive the event's properties
  from the invocation's input and output — through the new `Capabilities.ObservabilityMapping`, and
  plugin-observability listens to the operation invocation stream and sends the event, exactly as undo
  derives an inverse from an `UndoMapping`. `Create`, `Share`, `Migrate`, `AddObject` and `AddType`
  no longer invoke `ObservabilityOperation.SendEvent` themselves, `SpacePlugin`'s `observability`
  option now decides whether the mappings are registered, and `SpaceOperationConfig.observability` is
  removed as a result.

  Skills move to the plugins that own their subject. `@dxos/plugin-connector` now owns the
  `connectors` skill (import `ConnectorsSkill` from it; enabling ConnectorPlugin contributes it), and
  `@dxos/plugin-space` owns the **Database** skill — object CRUD over the projected verbs, exported as
  `DatabaseSkill` from `@dxos/plugin-space/DatabaseSkill`.

  `@dxos/assistant-toolkit`'s own database skill is now chat-context binding alone
  (`contextAdd`/`contextRemove`), so it is renamed: `ChatContextSkill`, keyed `org.dxos.skill.chatContext`,
  exporting `ChatContextHandlers` and `ChatContextOperations`. The `org.dxos.skill.database` key goes
  with the verbs to plugin-space's Database skill, so a chat already bound to it keeps reading and
  writing objects. Everything else either moved to
  plugin-space or was retired as a duplicate: `objectCreate`, `objectDelete`, `objectUpdate`, `query`
  and `load` are covered by the projected verbs; `relationDelete` by `removeObjects`, which already
  accepts relations; `tagAdd`, `tagRemove` and `schemaList` moved as the annotated `addTag`,
  `removeTag` and `queryTypes`; and `relationCreate` and `schemaAdd` merged into plugin-space's
  existing `addRelation` and `addType`, each gaining the described form (a typename, references, or a
  JSON Schema) beside the live one, so the same verb serves an in-process and a remote caller.

  `Capability.getAllAvailable` and `Plugin.activateIfAvailable` are new: they read the app's
  contributions where they exist and return nothing where they do not, declaring no requirement. This
  is what lets `addType` fire `SpaceEvents.TypeAdded` and its `OnTypeAdded` callbacks in the app while
  still running on a host that has neither. Two
  capabilities moved onto the plugin-space verbs with the operations: `queryObjects` gained `in` (scope
  results to objects reachable from the given ones — how queue-backed mail is addressed), and
  `getObject` became `getObjects`, taking an array so a batch of references resolves in one call.

  The `discord` and `linear` skills are removed. Both advertised a tool whose handler set was
  registered nowhere, so invoking either failed at runtime; plugin-discord and plugin-linear already
  own connector-based sync for those services.

  Skill definitions are the atomic unit of MCP projection. A skill's `tools` list decides which
  operations project as MCP tools, and the load-the-skill-first pointer in each tool's description
  derives from that membership (the SEP-2640 shape). **`Operation.mcpTool` is removed** — with
  inclusion decided by skills and safety carried by `Operation.mutation`, nothing was left that the
  operation's own meta could not say: a tool's name is the key's final segment and its description is
  the operation's `description`. The three surviving overrides moved into meta, and
  `ProjectOperation.Create`'s key becomes `projectCreate` (its final segment was a too-generic
  `create`, and the key is now what names the tool). Folding those descriptions into meta also puts
  them in front of the in-app assistant, which never saw the MCP-only text.
  `DatabaseSkill` and `CodeProjectSkill` opt in with `mcpPrompt: true` and list their verbs
  (`CodeProjectSkill` now exports `operations`, spanning the project, task, milestone and outline
  verbs).

  Safety generalized into operation meta: the new `Operation.mutation('none' | 'write' |
'destructive')` annotation classifies an operation's effect on state — side-effect free, mutating
  but recoverable, or irreversible — as a fact about the operation rather than MCP projection
  config. The MCP server maps it to `readOnlyHint`/`destructiveHint` exactly as `safety` did, and
  now also maps the existing `Operation.idempotent` annotation to `idempotentHint`. An unclassified
  operation emits no hints, which clients treat as possibly-destructive.

  The space operations are one namespace: `SpaceObjectOperation`'s verbs (`getObjects`,
  `queryObjects`, `queryTypes`, `updateObject`, `addTag`, `removeTag`) move into `SpaceOperation`, and
  the `@dxos/plugin-space/SpaceObjectOperation` subpath is removed — import them from
  `@dxos/plugin-space/SpaceOperation`. `addType` and `addRelation` also drop their `db` input: the
  database comes from `Database.Service`, which callers key with `{ spaceId }` in the invoke options.

  `addObject`, `addRelation` and `addType` now declare `Database.Service` as a required service, and
  the MCP projection keys the ambient `spaceId` tool parameter off that declaration — only
  space-addressed tools advertise it (`removeObjects` takes its space from the entities or
  space-qualified refs it is given, so it declares nothing and carries no parameter). Resolution is
  strict: the service materializes only from `InvokeOptions.spaceId` (or the parent process's
  environment for nested invocations), so every call site that needs the database passes
  `{ spaceId: db.spaceId }` in options — the create-object entries across the plugins included.

  `@dxos/app-toolkit` gains `NavigationResolver.forType(type, { getPath, getLabel?, position?, pages? })`
  — the whole body of the common custom-section navigation resolver (load the queried object, check it
  is an instance of the type, answer the section's path for it), so contributing one is a one-call
  module. Sections built with `TypeSection.createTypeSectionExtension` still need no resolver at all:
  their url binding ends in the typename, which plugin-space's generic lookup already reads.
  plugin-studio and plugin-inbox now use the helper, and the custom-shaped sections that were missing
  a resolver gained one through it — plugin-blogger (Publication), plugin-code (CodeProject) and
  plugin-commerce (Provider) — so their objects resolve to their sections instead of only the generic
  database path.

  Each plugin exposes one operation handler set, on the subpath convention. `@dxos/plugin-space`'s
  `./operations` subpath is replaced by `./SpaceOperationHandlerSet`, whose single `handlers` set
  carries every space operation — the separate curated "serializable" subset is gone, because the
  constraint that forced it is: the new `Operation.serializable(operations)` serializes a handler
  list tolerantly, dropping (with a warning) the few operations whose input schemas cannot render as
  JSON, so a registry can be fed the full set without an `ImportSpace`-style schema failing the whole
  registration.

  `@dxos/mcp-server`'s two namespaces are renamed. `Gateway` becomes **`McpRegistry`** — "gateway"
  reads as an MCP proxy fronting other servers, which is the opposite of what it is: the host's link
  to its operation registry, which a host implements (`/McpRegistry`). `Server` becomes `McpServer`,
  and it absorbs the skill-backed surface: `McpServer.fromSkills({ skills })` yields the projected MCP surface (prompts, tools,
  `skillLoad`) requiring only `Operation.Service`, beside `McpServer.layer` for a host reading a
  registry through `Gateway`. The name deliberately shadows effect's `McpServer` because it wraps
  it — `toolkit` and `layerStdio` are re-exported, so a host needs one import rather than two under
  different names. The package exports `/Gateway` and `/McpServer`, each with a build entry so the
  published package can resolve them. `Gateway.SkillRecord` carries `tools`.

  Fixed in `@dxos/echo` along the way: a struct with an open rest signature (`Schema.StructWithRest`)
  now survives the JSON Schema round-trip. Effect 4 omits `additionalProperties` when the rest
  signature's value type is unconstrained, and the serializer only restored it for bare records — so
  the decoder rebuilt the struct closed and `addObject`'s draft silently dropped every field beyond
  `@type`. The restore now applies whenever the key is absent, which is unambiguous: a closed struct
  always carries `additionalProperties: false` explicitly.

  `addObject` persists a described object rather than only referencing it. A draft is instantiated detached and `CollectionModel.add` files it by pushing a ref — on the branch that mints a root collection for a space that has none, nothing added the object to the database, so the ref dangled: the call returned an id whose object could not be read back, and nothing replicated. Only the remote path was reachable, since in-process callers pass a live object that is already in a database.

  A database is no longer an operation input. `SpaceOperation.AddObject` and `InboxOperation.AddMailbox` take `target` as an optional _collection_ — absent means the space root — and resolve the database from the invocation's space id instead. A database is an in-process handle that cannot cross an RPC boundary, so accepting one in an input schema only ever worked for in-process callers; naming the space is the form that works for both. Call sites that passed `target: db` drop it (most already passed the matching `spaceId`), and the handlers lose the `Effect.provide(Database.layer(db))` they needed to reconcile an input database against the declared service.

- 9684ee8: One project skill. The repo carried two: `@dxos/assistant-toolkit`'s `org.dxos.skill.project`, a small skill for filing artifacts into a project chat, and `@dxos/plugin-projects`' `org.dxos.plugin.projects.skill.codeProject`, which held the whole work-stream workflow. They are now one.

  The survivor is `org.dxos.skill.project`, which keeps its `artifactAdd`/`artifactList` operations, gains the full workflow instructions, and now projects as an MCP prompt — `/project`, the name `codeProject` only ever existed to avoid a collision with.

  It lives in `@dxos/plugin-projects`, which owns the verbs it drives. A skill that cannot import its own operations can only name them as strings, and an unresolvable ToolId is dropped from the session toolkit with nothing but a log line — so the tool list is now checked by the compiler. `@dxos/plugin-assistant` no longer contributes the skill or its handlers (it cannot depend on `@dxos/plugin-projects` without a cycle); the plugin that owns the verbs contributes both.

  Breaking: `@dxos/assistant-toolkit` no longer exports `ProjectSkill`, `ProjectHandlers` or `ProjectOperations` — import them from `@dxos/plugin-projects/ProjectSkill` and `#skills`. The two artifact operations move to the `projects` domain to match their defining package: `org.dxos.operation.assistantToolkit.{addArtifact,listArtifact}` become `org.dxos.operation.projects.{addArtifact,listArtifact}`, so the tools rename from `assistant-toolkit-{add,list}-artifact` to `projects-{add,list}-artifact`. The Agent skill drops its instruction to file work products, which named a tool it did not declare.

  Breaking for out-of-repo consumers: `@dxos/plugin-projects` no longer exports the `./CodeProjectSkill` subpath, and the skill key `org.dxos.plugin.projects.skill.codeProject` is gone. A `Project` object's `SkillsAnnotation` already named `org.dxos.skill.project`, so a project-scoped chat now loads the consolidated skill rather than the artifact-filing subset.

  Also: the ten task and project operations that used to serialize their result with `Entity.toJSON` and declare it as `Schema.Unknown` now name the real schema (`Type.getSchema(Task.Task)` and friends) and return the live object. The MCP server already serializes what it returns, so the snapshot round trip only cost the type. An in-app caller that reloaded the result by id can use it directly; an MCP client sees the same JSON as before, now under a declared output schema.

  Also: four operations are gone, each folded into a verb that already existed. `tasks-complete` and
  `tasks-assign` were `tasks-update` with one field; `tasks-update-milestone` was a plain field patch,
  now `space-update-object`; `projects-list` was a type query plus a projection, now
  `space-query-objects`. None of the four guarded an invariant — the ones that do (appending to
  `TaskSet.tasks`, sweeping it on delete, reordering it, deriving milestone progress) are all still
  here, and every operation now carries a JSDoc saying which side of that line it falls on. The
  `RunInstructions` routine tool `completeJob` also drops strict mode when the routine declares no
  output, since an arbitrary payload cannot be expressed under Anthropic's strict tool validation.

  Also: `@dxos/plugin-projects` and `@dxos/plugin-tasks` gain headless `node` variants — `#plugin` and
  `#capabilities` now resolve `plugin.node.ts` and `capabilities/node.ts` under the `node` condition,
  registering schema, operations and (for projects) the skill without the React surfaces the browser
  barrel declares. Both plugins join the CLI's set and its default-enabled list, so `dx mcp serve`
  reaches the project and task verbs the way it reaches every other plugin's, rather than through
  direct handler-set imports — and the types those verbs write are registered, which is what a project
  create needs to store its graph. A profile that has already been configured needs
  `dx plugin enable org.dxos.plugin.projects org.dxos.plugin.tasks`; a fresh one gets both.

- 983fe1d: Removed the Agent Wizard skill. `AgentWizardSkill`, `AgentWizardHandlers` and `AgentWizardOperations` are gone from `@dxos/assistant-toolkit`, and the skill is no longer contributed or bound into new chats by `@dxos/plugin-assistant`.

  Its wizard-only tools (`org.dxos.operation.assistantToolkit.createAgent`, `org.dxos.operation.assistantToolkit.getAgentRules`) are removed with it — agent creation is now a UI action. `SyncAutomation` (`org.dxos.operation.assistantToolkit.syncTriggers`) is unchanged and keeps its key, but now lives in the agent skill: reach it via `AgentSkillOperations.SyncAutomation` and register `AgentSkillHandlers`.

### Patch Changes

- 49aee6c: Routines no longer burn turns fighting `completeJob`, and a completed job is no longer reported as a failure.

  - `completeJob`'s `success`, `failure` and `failure.description` parameters accept an explicit `null` alongside omission. Models routinely emit `null` for the branch they are not using, and the previous optional-only shape rejected that with `Invalid parameters for tool 'completeJob': Expected object | undefined`, so the agent had to guess a second and third encoding of the same completion signal (DX-1189).
  - When a call carries both a `success` payload and a `failure`, the success now wins: a model that filled the unused branch with a placeholder was discarding work the routine had actually completed.
  - The routine system prompt asks for one branch only, and omission of the other.
  - Tool failures log the tool name and error message explicitly, so a rejected tool call is diagnosable from a debug bundle.

- f048062: Fix the database `query` tool description so the `in` example uses the URI strings its input schema declares, removing a failed call and retry on every scoped query.
- Updated dependencies [0280a6a]
- Updated dependencies [9477170]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [cd205fb]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [d2be597]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [2d4107f]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [a3d45c4]
- Updated dependencies [6d28380]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [7575cb6]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [dbff1e4]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [dde6714]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5ceaf9c]
- Updated dependencies [8ca2ac7]
- Updated dependencies [098a0bb]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [ebb8f4a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [ab79741]
- Updated dependencies [40ecd44]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [02fe893]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [a09e18e]
- Updated dependencies [fc8c80c]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [306f50d]
- Updated dependencies [e207c68]
- Updated dependencies [74f9b30]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-toolkit@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/agent-runtime@0.12.0
  - @dxos/assistant@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/types@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/util@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/agent-runtime@0.11.1
- @dxos/ai@0.11.1
- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/assistant@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/compute@0.11.1
- @dxos/compute-runtime@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/protocols@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-syntax-highlighter@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- bda1a02: Add an optional `attach` flag to the `database.objectCreate` operation that files the created object in the space root collection (visible in the navigation tree). CLI: `dx profile create` templates now enable edge features (fixes device invitations hanging at "Connecting…" for CLI-created profiles), and `dx halo share` prints the joinable URL.
- 37c17cc: Project model unification, phase 1 (breaking, no data migration — nothing deployed). Two forms of work: markdown checklists (`Outline`) are the cheap, fluid form; ECHO `Task` objects in a `TaskSet` are the durable, assignable form; promotion links the two. `ExternalProject` becomes `TaskSet` (`org.dxos.type.taskSet@0.2.0`); containment is the ECHO parent edge (`TaskSet → Task → sub-Task`), replacing the `Task.project` ref. `Task` 0.2.0 renames `assigned: Ref<Person>` to `assignee: Actor` (human by Person ref/email/name, agent by DID) and adds `failed`/`cancelled` statuses. `Outline` moves into `@dxos/types` (0.2.0) with checklist markdown helpers and the task-promotion helpers. `Project` 0.3.0 adds `goals`, `outline`, and `taskSet`. The `Plan` type is REMOVED: a conversation's working set is its outline (`Chat.outline`; project chats write the project's outline) plus promoted Tasks; the planning skill edits checklist markdown, and delegation promotes to a durable agent-assigned Task the supervisor reconciles over.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [ed992c2]
- Updated dependencies [1a9bca1]
- Updated dependencies [ed992c2]
- Updated dependencies [bf013a1]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/agent-runtime@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/react-ui-syntax-highlighter@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
