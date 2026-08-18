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

`@dxos/assistant-toolkit`'s own `DatabaseSkill` keeps its key but drops the operations plugin-space
now covers and is renamed **Database schema** for what remains: schema and relation creation, and
chat-context binding. Gone from it: `objectCreate`, `objectDelete`, `objectUpdate`, `query` and
`load` (covered by the projected verbs); `relationDelete` (covered by `removeObjects`, which already
accepts relations); and `tagAdd`, `tagRemove` and `schemaList`, which moved to plugin-space as the
annotated `addTag`, `removeTag` and `queryTypes`. Two
capabilities moved onto the plugin-space verbs with the operations: `queryObjects` gained `in` (scope
results to objects reachable from the given ones — how queue-backed mail is addressed), and
`getObject` became `getObjects`, taking an array so a batch of references resolves in one call.

The `discord` and `linear` skills are removed. Both advertised a tool whose handler set was
registered nowhere, so invoking either failed at runtime; plugin-discord and plugin-linear already
own connector-based sync for those services.
