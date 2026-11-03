---
'@dxos/echo': minor
'@dxos/echo-client': minor
'@dxos/protocols': minor
---

A plugin bundle on EDGE resolves types other plugins publish. A registry query for types by key (`Filter.and(Filter.type(Type.Type), Filter.key(typename))` over `Scope.registry()`) asks the type sources registered with `HypergraphImpl.registerTypeSource` (`@dxos/echo-client`) for the types the in-process registry lacks, and caches what they return there; with no source installed it behaves as before. `PluginProtocol.Env` gains `TYPE_REGISTRY`, EDGE's registry of published types, which the plugin host installs as a type source, so `space.queryObjects`, `space.addObject` and `space.addRelation` find types other plugins publish with the same query on a client and on EDGE.
