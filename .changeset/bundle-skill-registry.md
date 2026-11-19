---
'@dxos/echo': minor
'@dxos/echo-client': minor
'@dxos/compute-runtime': minor
'@dxos/assistant': minor
'@dxos/assistant-toolkit': patch
'@dxos/protocols': minor
---

A registry can now consult async sources for what it does not hold. `Registry.Registry` gains `addSource`, `resolve` and `fetch`, and a registry query's `run()` asks the sources before it answers: by key, or, for a query that names none, by enumerating. `runSync()` and `results` still read only what the registry holds. This replaces echo-client's `TypeSource` and `registerTypeSource`: call `graph.registry.addSource(source)` with a `Registry.Source` (`resolve(uri)`, and optionally `query(query)`). The compute runtime's `typeSource` option becomes `registrySource`. `describeTypes` now takes the type entities to describe, not a database, and the skill manager's `queryTypes` reads them with `Registry.runQuery(Filter.type(Type.Type))`, so it also lists types from the registry's sources.

`PluginProtocol.Env` gains an optional `REGISTRY` (`PluginProtocol.Registry`): EDGE resolves and lists the types, skills and operation records its enabled plugins publish, and a plugin bundle's host makes it the source of each invocation's registry. A skill bound by registry URI, `querySkills` and `queryTypes` then reach whichever plugin contributes the entity, not only the bundle's own. `TYPE_REGISTRY` remains for hosts published before `REGISTRY`.
