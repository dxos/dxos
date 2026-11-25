---
'@dxos/echo-client': minor
'@dxos/compute-runtime': minor
'@dxos/assistant': minor
'@dxos/assistant-toolkit': patch
'@dxos/protocols': minor
---

echo-client's registry can now consult async sources for what it does not hold. `HypergraphImpl.registerRegistrySource(source)` takes a `RegistrySource` (`resolve(uri)`, and optionally `query(query)`) and replaces `registerTypeSource`. A registry query's `run()` asks the sources before it answers: by key, or, for a query that names none, by enumerating. A registry URI (`dxn:`) resolves through them too. `runSync()` and `results` still read only what the registry holds, and `@dxos/echo`'s `Registry` interface is unchanged. The compute runtime's `typeSource` option becomes `registrySource`. `describeTypes` now takes the type entities to describe rather than a database. The skill manager's `queryTypes` reads them with a registry-scoped database query, so it also lists types from the registry's sources.

`PluginProtocol.Env` gains an optional `REGISTRY` (`PluginProtocol.Registry`). EDGE uses it to resolve and list the types, skills and operation records its enabled plugins publish, and a plugin bundle's host makes it the source of each invocation's registry. A skill bound by registry URI, `querySkills` and `queryTypes` then reach whichever plugin contributes the entity, not only the bundle's own. `TYPE_REGISTRY` remains for hosts published before `REGISTRY`.
