# @dxos/plugin-projects

## 0.12.0

### Minor Changes

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

- b767bc1: Deleting a task can now be undone, sub-tasks included. `DeleteTask` returns a `TaskRestorePoint` alongside `deleted` — the removed subtree with the position each task held in its set's `tasks` array — and the new `RestoreTasks` operation is registered as its inverse, so the delete raises an undo toast like any other reversible action.

  `RestoreTasks` deliberately declares no services. Undo replays an inverse without a spaceId, so `Database.Service` would not resolve; the handler reads the database off the tasks being restored, the same shape `SpaceOperation.RestoreObjects` uses. The tasks travel as objects rather than refs because a ref to a deleted object no longer resolves, which also means the restore point is an in-process payload and not something an agent can hold across a tool call.

  `plugin-projects` now declares `dependsOn: ['org.dxos.plugin.tasks']`. A project's tasks are a `TaskSet` rendered by plugin-tasks' own section surface, and the project skill exposes the task verbs. This is enforced: the plugin manager leaves a plugin disabled when a declared dependency is absent, so any host enabling Projects must also supply Tasks. The mobile plugin set did not, and now does.

### Patch Changes

- 08c82f9: `projects.create` projects as the `projectCreate` MCP tool, so the last curated project verb in edge's MCP server can retire — the operation already serialized into the registry and only lacked the annotation.

  The entries a headless host imports directly (`./operations`, and plugin-projects' `./skills`) are now guarded against React reaching them, closing the gap that made those imports a silent liability.

  `dx-trace-imports` accepts repeated `--export` and `--to`, so one guard covers every entry a headless host imports. Repeating either flag previously stringified the array into a value matching nothing; `--to` failed silently, which is how plugin-jmap's and plugin-google's headless constraints went unenforced.

- 34a8433: The Project sidebar section is now addressed as `project` in URLs instead of `topic`, a leftover from the Topic→Project succession. Existing `/topic/<id>` links no longer resolve.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- f8ec427: Promote the Projects plugin from Labs to Alpha, so it appears under Recommended in the plugin registry.
- 1ca0974: Reduce re-renders in the project and task-set articles: subscribe to ref-list membership instead of whole objects, and resolve owned refs (instructions, outline, task set, artifacts) without tracking their mutations.
- 0c92b44: `TaskList.Edit` gains `showDescription`, which edits a description under the title — the selected
  task's, or the new task's when creating, so a task can be added with one. The combobox trigger now
  collapses its caret column when a caller supplies its own children, which was painting a strip of
  trigger surface beside the field.
- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [4025ffe]
- Updated dependencies [2cad6c0]
- Updated dependencies [af1c007]
- Updated dependencies [cd205fb]
- Updated dependencies [106d38a]
- Updated dependencies [b7d66c8]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [cd6f37f]
- Updated dependencies [9477170]
- Updated dependencies [a1075de]
- Updated dependencies [9fe88c8]
- Updated dependencies [15f952c]
- Updated dependencies [592b00e]
- Updated dependencies [6d52561]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [f3f55a8]
- Updated dependencies [51c7e91]
- Updated dependencies [4521dec]
- Updated dependencies [b2d5bb2]
- Updated dependencies [3aa3d63]
- Updated dependencies [2d4107f]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [2fd4095]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [5305365]
- Updated dependencies [881f900]
- Updated dependencies [9c86066]
- Updated dependencies [a09e18e]
- Updated dependencies [a3d45c4]
- Updated dependencies [8a77160]
- Updated dependencies [6d28380]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [dbff1e4]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [3e02201]
- Updated dependencies [4800a6f]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [5bb340f]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [098a0bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [9c86066]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bf4f1e6]
- Updated dependencies [81b5eb2]
- Updated dependencies [9477170]
- Updated dependencies [cc45381]
- Updated dependencies [bcfe4c5]
- Updated dependencies [6328de3]
- Updated dependencies [12b6618]
- Updated dependencies [fa36e26]
- Updated dependencies [098a0bb]
- Updated dependencies [ebb8f4a]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [3214dcf]
- Updated dependencies [24fcadc]
- Updated dependencies [77a2d34]
- Updated dependencies [4804da0]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [9684ee8]
- Updated dependencies [7c426d4]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [1b6e258]
- Updated dependencies [881f900]
- Updated dependencies [881f900]
- Updated dependencies [93c7523]
- Updated dependencies [4a71ef2]
- Updated dependencies [987f7e1]
- Updated dependencies [e7fc023]
- Updated dependencies [1ab4bb8]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [08c82f9]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [f048062]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [098a0bb]
- Updated dependencies [20e86ba]
- Updated dependencies [1482a3f]
- Updated dependencies [983fe1d]
- Updated dependencies [2513a52]
- Updated dependencies [098a0bb]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [0280a6a]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [dea5df9]
- Updated dependencies [098a0bb]
- Updated dependencies [098a0bb]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [a805212]
- Updated dependencies [77d0026]
- Updated dependencies [ea11703]
- Updated dependencies [886453b]
- Updated dependencies [18597fc]
- Updated dependencies [63629c5]
- Updated dependencies [881f900]
- Updated dependencies [66f381d]
- Updated dependencies [d8e9de1]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [b767bc1]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [5d816a6]
- Updated dependencies [f9816c0]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [714beb8]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [79d5ecf]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/plugin-markdown@0.12.0
  - @dxos/plugin-assistant@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/plugin-inbox@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/assistant-toolkit@0.12.0
  - @dxos/link@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/plugin-tasks@0.12.0
  - @dxos/react-ui-task@0.12.0
  - @dxos/types@0.12.0
  - @dxos/extractor-lib@0.12.0
  - @dxos/plugin-space@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/graph@0.12.0
  - @dxos/app-graph@0.12.0
  - @dxos/react-ui-menu@0.12.0
  - @dxos/plugin-routine@0.12.0
  - @dxos/util@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/react-ui-attention@0.12.0
  - @dxos/react-ui-masonry@0.12.0
  - @dxos/react-ui-tabs@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- Updated dependencies [5fde190]
  - @dxos/plugin-inbox@0.11.1
  - @dxos/app-framework@0.11.1
  - @dxos/app-toolkit@0.11.1
  - @dxos/assistant@0.11.1
  - @dxos/assistant-toolkit@0.11.1
  - @dxos/compute@0.11.1
  - @dxos/echo@0.11.1
  - @dxos/echo-react@0.11.1
  - @dxos/effect@0.11.1
  - @dxos/invariant@0.11.1
  - @dxos/keys@0.11.1
  - @dxos/react-ui@0.11.1
  - @dxos/react-ui-form@0.11.1
  - @dxos/react-ui-list@0.11.1
  - @dxos/react-ui-masonry@0.11.1
  - @dxos/react-ui-menu@0.11.1
  - @dxos/react-ui-search@0.11.1
  - @dxos/types@0.11.1
  - @dxos/util@0.11.1
  - @dxos/plugin-assistant@0.11.1
  - @dxos/plugin-graph@0.11.1
  - @dxos/plugin-routine@0.11.1
  - @dxos/plugin-space@0.11.1

## 0.11.0

### Patch Changes

- 89fdccc: Publish `@dxos/plugin-projects`: the package is no longer private and declares public publish access.
- 34f774a: Routines created from a project are now owned by it, so deleting the project deletes its routines (and their triggers) instead of leaving them behind.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a256a87]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [ed992c2]
- Updated dependencies [724d468]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [2fb1993]
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
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [98d79ec]
- Updated dependencies [277e365]
- Updated dependencies [1872bc0]
- Updated dependencies [ba7aabf]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [3b4a7c8]
- Updated dependencies [6dd1aa8]
- Updated dependencies [2543b63]
- Updated dependencies [33e1a3d]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [a2447cd]
- Updated dependencies [9cde1c6]
- Updated dependencies [0afbf15]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [9ded6b9]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [1a989ed]
- Updated dependencies [bda1a02]
- Updated dependencies [0a4bbde]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [cd3ed11]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [a83d98a]
- Updated dependencies [bf055c8]
- Updated dependencies [55bb048]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [25272e3]
- Updated dependencies [0e3a1a9]
- Updated dependencies [cb14d6e]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/plugin-assistant@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/plugin-routine@0.11.0
  - @dxos/plugin-inbox@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/types@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-masonry@0.11.0
  - @dxos/plugin-space@0.11.0
  - @dxos/assistant-toolkit@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/assistant@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0
