---
'@dxos/echo': minor
'@dxos/echo-client': minor
'@dxos/protocols': minor
---

A plugin bundle on EDGE resolves types other plugins publish. `Scope.registry('remote')` is implemented: a query that includes it and filters by `Filter.key(typename)` asks the type sources registered with `HypergraphImpl.registerTypeSource` (`@dxos/echo-client`) for the types the in-process registry lacks, and caches what they return there. `PluginProtocol.Env` gains `TYPE_REGISTRY`, EDGE's registry of published types, which the plugin host installs as a type source; `space.queryObjects`, `space.addObject` and `space.addRelation` query it for a typename no local plugin registered.
