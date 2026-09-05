# @dxos/compute

## 0.12.0

### Minor Changes

- b8762ef: Chat context binding is now contributed through the `SubjectContext` capability: a chat opened against an object binds whatever every applicable provider derives from it, rather than a hardcoded set of cases. Project chats are ordinary companion chats — `ProjectOperation.CreateChat` is removed, and a project's instructions and skills reach its chat through a contributed provider. Adds `Skill.resolveAnnotatedSkills`, which resolves a type's declared skills across the registry and the space with a space copy (a fork) winning.
- a3d45c4: Hide objects from the collection tree when their type is not available in the build, and hide the plugin-registry button in builds without the registry. `Skill`, `Agent` and `Sequence` icons now share the amber hue of `Session`, `Project` and `Routine`, and a curated build no longer offers creating the unfinished `Agent` and `Sequence` types (`AssistantPluginOptions.experimentalTypes`).
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

- 78523d2: Model-facing tool names now derive from an operation's DXN key, never from `meta.name`.

  `Operation.toolName(op)` is the single derivation — strip the constant `org.dxos.function.` prefix, kebab-case each camelCase segment, join with `-`, so `org.dxos.function.markdown.create` becomes `markdown-create` and `org.dxos.function.project.artifactAdd` becomes `project-artifact-add`. Keys outside that prefix keep every segment. `Operation.toolNameFromKey` does the same for a persisted record's key.

  Both the tool runtime and `Skill.toolDefinitions` use it, so a skill's `tools` array and the names the model calls are one identifier space; the lookup that previously bridged the two is gone. This makes `meta.name` pure display copy — rewording it no longer renames a tool — and removes the live collisions where `create` was claimed by plugin-markdown, plugin-script and plugin-sheet, `open` by plugin-markdown and plugin-transcription, and `update` by plugin-markdown and plugin-script. `createToolkit` now asserts tool-name uniqueness across an assembled session toolkit.

  The derivation is not injective: kebab-casing makes `webSearch` and `web-search` converge, and
  hyphenated segments are live (`plugin-crm`, `web-search`). Two keys claiming one name is an authoring
  error, caught by `Operation.findToolNameCollisions` where the app registers every operation, and by the
  tool resolver, which fails rather than picking the first match.

  Breaking for anything that hardcodes a tool name: skill instruction texts should interpolate `Operation.toolName(Op)` rather than spell the name out, and recorded model-conversation fixtures that captured the old names must be regenerated.

- 4a10672: New `useOperationHandler(operation, map?)` hook: suspensefully resolves an operation's handler as an effect fn (`(input) => Effect<Output>`), or — with `map` — as a callback-args binding (`(...args) => Effect<Output>`). The component suspends while the handler's module lazy-loads; a miss throws `NoHandlerError`. Resolution goes through the new `Capabilities.OperationHandlers` singleton — the merged reactive handler set the process manager already builds for the operation invoker, now also contributed as a capability. `OperationHandlerSet.reactive` memoizes `getHandlerFor` promises per key (invalidated when contributions change) so React's `use` can resume suspended renders, and `OperationHandlerSet.findHandler(set, definition)` is the definition-typed promise counterpart of `getHandler`.

  `useSpaceCallback` now passes the returned callback's arguments through to `fn`, so gesture handlers can build effects from per-call inputs. BREAKING: the optimistic-overlay layer is removed entirely — `useOptimisticOperation`, `OptimisticBinding`, `useOptimisticQuery`, and the `@dxos/app-framework/Optimistic` module. Local-first sync writes need no overlay; a query view is a memoized `Atom.make` over `query.atom` read with `useAtomValue`.

  New `Ref.peek()` / `Database.peek(ref)` — the target when already materialized: the pinned target or a side-effect-free working-set lookup; never throws, never triggers loading. `Ref.target` is deprecated in its favor (it loads and registers a resolution callback as side effects, and can throw). Compose `Database.peek(ref) ?? (yield* Database.load(ref))` for a sync-when-materialized read with an async fallback — an effect built only from materialized refs runs under `Effect.runSync`. `Database.load` itself is unchanged — its async resolution also settles a just-added object into its own document, which flows like branching depend on. `TaskSet.resolveParentTask` uses that composition, and its cycle check walks the candidate's `parentTask` ancestor chain (equivalent to the old subtree collection, and it sees cross-set descendants) instead of querying.

  BREAKING: `TaskOperation.MoveTask`'s input requires a `taskSet` ref alongside the task and its handler needs no services. With loaded refs the whole operation completes without an async boundary — a drop runs it with `Effect.runSync` so the write lands in the gesture frame, with no optimistic overlay — while unloaded refs (e.g. an agent caller) load asynchronously through the same path.

### Patch Changes

- 5180720: A failed lazy operation handler load is no longer memoized, so retrying the operation re-imports the module. Previously `OperationHandlerSet.lazy` cached the rejected dynamic-import promise, so once a chunk fetch failed — e.g. a stale asset hash after a redeploy — every later invocation of that operation rejected instantly without re-fetching, and only a page reload recovered.
- 7c426d4: Present operations that yield via `Operation.runAgain()` (`RunAgainError`) as a distinct "incomplete" state in the trace graph and routine run list, rather than a hard error, since the run will be re-invoked. The `operation.end` trace event now carries the failing error's `errorCode` so consumers can distinguish a run-again yield from a genuine failure.
- 256f286: Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

  `toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

  Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.

- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [f3f55a8]
- Updated dependencies [b2d5bb2]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [3e02201]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
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
- Updated dependencies [12b6618]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [578b543]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/types@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/vendor-kbn-handlebars@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/protocols@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/vendor-kbn-handlebars@0.11.1

## 0.11.0

### Minor Changes

- a19443b: Add a `direct` trigger kind that is invoked on demand rather than scheduled by the dispatcher, along with its spec/event constructors and an `isManuallyInvokable` helper.
- 5e7839e: Mailbox sync progress can now be cancelled from the sync meter: for an edge-executed sync trigger the cancel control stops the current run and its continuation chain, while the trigger's schedule stays enabled and re-syncs on its next tick. `@dxos/compute` now exports the `Cancellation` service the runtimes provide (`Cancellation.Service`) and operations observe (`Cancellation.signal`).

  Breaking:
  - `@dxos/app-toolkit`: `ProgressTraceSinkOptions.terminateProcess` is renamed to `cancelProcess` and takes a `CancelTarget` (pid, space, runtime, trigger) instead of a pid, so a cancel can be routed to the runtime that owns the run.
  - `@dxos/compute-runtime`: `SwarmRemoteTraceMonitorOptions.subscribe` yields `SwarmTraceBroadcast` (`{ payload, tags }`) instead of a bare payload — the envelope tags carry the ref-typed trace meta dropped by the wire codec.

- 6067460: `McpToolAnnotation` opts an operation into MCP projection: a name, model-facing description, safety class (`read`/`write`/`destructive`), and aspect, applied at the definition site with `Operation.mcpTool({ … })` and read back with `Operation.getMcpTool`. The annotation rides through `Operation.serialize` into the persisted record, so a remote projector (edge mcp-space-service) discovers tools from the operation registry instead of a hand-maintained table. Projected operations must be remotely invocable — refs in, JSON snapshots out, serializable schemas, worker-safe handlers.
- f7d7735: Add `Project` (`@dxos/compute`), the successor to `Topic`, holding owned instructions, routine references, and an artifacts collection; the `Routine` schema moves into `@dxos/compute` alongside it. `Instructions` gains a structured `commands` field, surfaced as sentinel-command autocomplete in the assistant chat prompt. The existing `@dxos/types` GH/Linear-style `Project` (name, description, image) is renamed to `ExternalProject` to free the typename for the new concept. `dx-input` now owns its full input chrome (padding, focus shift, a single-band ring/border treatment) so markdown-backed fields match plain inputs.
- 7b270f2: Subscription triggers now report a real mutation type on `SubscriptionEvent.type` — `'created' | 'updated' | 'deleted'` (previously the placeholder `'unknown'`; the field is now a narrowed literal). Subscription semantics (create/update/delete) apply uniformly to both the space database and feed items — build a feed-scoped subscription with `Trigger.specSubscription(Query.select(...).from(Scope.feed(...)))`. Change detection is content-signature based (feed-backed objects are unversioned), and deletes are detected uniformly via queryable tombstones (`deleted: 'include'` + `Obj.isDeleted`) for both sources — a feed removal now leaves a body-preserving tombstone in the index.
- 37c17cc: Project model unification, phase 1 (breaking, no data migration — nothing deployed). Two forms of work: markdown checklists (`Outline`) are the cheap, fluid form; ECHO `Task` objects in a `TaskSet` are the durable, assignable form; promotion links the two. `ExternalProject` becomes `TaskSet` (`org.dxos.type.taskSet@0.2.0`); containment is the ECHO parent edge (`TaskSet → Task → sub-Task`), replacing the `Task.project` ref. `Task` 0.2.0 renames `assigned: Ref<Person>` to `assignee: Actor` (human by Person ref/email/name, agent by DID) and adds `failed`/`cancelled` statuses. `Outline` moves into `@dxos/types` (0.2.0) with checklist markdown helpers and the task-promotion helpers. `Project` 0.3.0 adds `goals`, `outline`, and `taskSet`. The `Plan` type is REMOVED: a conversation's working set is its outline (`Chat.outline`; project chats write the project's outline) plus promoted Tasks; the planning skill edits checklist markdown, and delegation promotes to a durable agent-assigned Task the supervisor reconciles over.
- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [bdf9f68]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/vendor-kbn-handlebars@0.11.0
