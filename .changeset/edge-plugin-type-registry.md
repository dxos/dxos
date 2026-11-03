---
'@dxos/echo': minor
'@dxos/protocols': minor
---

A plugin bundle on EDGE resolves types other plugins publish. `Hypergraph.registerTypeSource` adds an async source that type resolution asks after the registry and the space, and `Database.resolveType` resolves a type through it. `PluginProtocol.Env` gains `TYPE_REGISTRY`, EDGE's registry of published types, which the plugin host installs as that source; `space.queryObjects`, `space.addObject` and `space.addRelation` use it for a typename no local plugin registered.
