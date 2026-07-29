---
'@dxos/app-graph': minor
'@dxos/plugin-connector': minor
---

Drive connector-auth ("Connect X") toolbar actions from a `ConnectorAuthAnnotation` schema annotation, resolved by a single app-graph extension in plugin-connector — replacing the per-plugin `connectorAuthExtension` helper (removed). Owning plugins inline their own sync/generate toolbar actions. Adds `actionGroups` to `GraphBuilder.createExtension`/`createTypeExtension` and a `primary` menu-action variant.
