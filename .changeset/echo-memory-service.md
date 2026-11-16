---
'@dxos/sparql-sqlite': minor
---

Add `SqlSparqlEngineAsync` (`@dxos/sparql-sqlite/async`), the SPARQL engine over Effect's async `SqlClient`; the sync `SqlSparqlEngine` is unchanged. Add `MemoryService` in the new `@dxos/echo-memory`, with a SQLite implementation in `@dxos/echo-memory-sqlite`, and deprecate `FactStore` (`@dxos/pipeline-rdf`) and `BrainService` (`@dxos/plugin-agent`) in its favour. Add `facts` to `FeedProtocol.WellKnownNamespaces`, the feed namespace a space's memory writes go to first.
