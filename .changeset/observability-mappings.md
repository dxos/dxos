---
'@dxos/app-framework': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-observability': minor
'@dxos/plugin-space': minor
---

Observability events are now registered rather than emitted. A plugin contributes an
`ObservabilityMapping` — the operation, the event name, and how to derive the event's properties
from the invocation's input and output — through the new `Capabilities.ObservabilityMapping`, and
plugin-observability listens to the operation invocation stream and sends the event, exactly as undo
derives an inverse from an `UndoMapping`.

Space operations (`Create`, `Share`, `Migrate`, `AddObject`, `AddType`) no longer invoke
`ObservabilityOperation.SendEvent` themselves, so they can run on a host that has no telemetry plugin
at all; a different host supplies its own listener over the same stream. `SpacePlugin`'s
`observability` option now decides whether the mappings are registered, and
`SpaceOperationConfig.observability` is removed as a result.
