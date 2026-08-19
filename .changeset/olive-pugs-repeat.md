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
---

Space object CRUD is now projected from operations, and space operations no longer reach for app
plugins to do it.

`addObject`, `getObject`, `updateObject`, `removeObjects` and `queryObjects` are MCP-projected
operations, so a remote agent reads and writes space objects through the same verbs the app uses.
`addObject` and `removeObjects` accept references and object descriptions alongside live entities,
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
`DatabaseSkill` from `@dxos/plugin-space/skills`.

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
derives from that membership (the SEP-2640 shape) — `Operation.mcpTool` no longer decides
inclusion or names a skill, keeping only per-operation metadata (tool-name override, safety); its
`aspect` and `skill` fields are removed. An operation without the annotation projects with
defaults: the key's final segment as the name and no safety claims. `DatabaseSkill` and
`CodeProjectSkill` opt in with `mcpPrompt: true` and list their verbs (`CodeProjectSkill` now
exports `operations`, spanning the project, task and outline verbs).

`addObject`, `addRelation` and `addType` now declare `Database.Service` as a required service, and
the MCP projection keys the ambient `spaceId` tool parameter off that declaration — only
space-addressed tools advertise it (`removeObjects` takes its space from the entities or
space-qualified refs it is given, so it declares nothing and carries no parameter). To make the
requirement satisfiable everywhere, eager service resolution learned one rule: when an invocation
names no explicit space, a declared service already present in the calling context is satisfied by
it — an explicit `spaceId` still resolves through the resolver and overrides. The app's
create-object dispatch points and the direct spaceId-less call sites scope their invocations with
`Effect.provide(Database.layer(db))` accordingly.

`@dxos/mcp-server` gains `DxMcpService`: `make({ skills })` yields the projected MCP surface
(prompts, tools, `skillLoad`) requiring only `Operation.Service` — the in-process front door,
beside the registry-backed `Gateway` that remote hosts keep. The package now exposes
per-namespace subpaths (`/Gateway`, `/Server`, `/DxMcpService`); wire-only hosts import the first
two so their bundles never carry the operation runtime. `Gateway.SkillRecord` carries `tools`.
