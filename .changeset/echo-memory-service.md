---
'@dxos/sparql-sqlite': minor
---

Add `MemoryService` in the new `@dxos/echo-memory`, with a SQLite implementation in `@dxos/echo-memory-sqlite`, and serve it from the client services host: `client.memory(spaceId)` returns a space's memory, kept in the host's database and written through the space's `facts` feed (replicated when the stack option `replicateFacts` is set). `FactStore` (`@dxos/pipeline-rdf`) and `BrainService` (`@dxos/plugin-agent`) are deprecated in its favour.

`@dxos/sparql-sqlite` adds `SqlSparqlEngineAsync` (`@dxos/sparql-sqlite/async`) over Effect's async `SqlClient`, and a table prefix so several stores can share one database; `FactStoreLive.makeAsync` and `MemorySqlite.makeAsync` build on them. `FeedProtocol.WellKnownNamespaces` adds `facts`.
