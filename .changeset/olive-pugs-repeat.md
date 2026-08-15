---
'@dxos/app-framework': minor
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

The `connectors` skill moves from `@dxos/assistant-toolkit` to `@dxos/plugin-connector`, which owns
the connectors it tells the model to prompt for. Import `ConnectorsSkill` from
`@dxos/plugin-connector`; enabling ConnectorPlugin now contributes it.
