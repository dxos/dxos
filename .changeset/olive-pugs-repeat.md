---
'@dxos/app-framework': minor
'@dxos/cli': minor
'@dxos/app-toolkit': minor
'@dxos/assistant-toolkit': minor
'@dxos/plugin-connector': minor
'@dxos/plugin-observability': minor
'@dxos/plugin-space': minor
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
