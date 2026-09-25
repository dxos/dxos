---
'@dxos/app-framework': minor
'@dxos/cli': minor
'@dxos/app-toolkit': minor
'@dxos/assistant-toolkit': minor
'@dxos/plugin-connector': minor
'@dxos/plugin-observability': minor
'@dxos/plugin-space': minor
'@dxos/compute': minor
'@dxos/mcp-server': minor
'@dxos/plugin-projects': minor
'@dxos/plugin-tasks': minor
'@dxos/plugin-blogger': minor
'@dxos/plugin-code': minor
'@dxos/plugin-commerce': minor
'@dxos/plugin-inbox': minor
'@dxos/plugin-studio': minor
'@dxos/echo': patch
---

Space object CRUD is now projected from operations, and space operations no longer reach for app
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
