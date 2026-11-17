---
'@dxos/sparql-sqlite': minor
---

Add `MemoryService` in the new `@dxos/echo-memory`, with its memory core `RdfMemory` in `@dxos/echo-memory-sqlite`. A memory runs over the `RdfStore` port: SPARQL reads, batches of quad writes, and bulk export and import as TriG or a compact binary form. In the app, `client.rdf(spaceId)` returns a space's store, kept by the client services host in its own database and logged to the space's `facts` feed (replicated when the stack option `replicateFacts` is set); the page runs `RdfMemory.make(client.rdf(spaceId))` beside it. `FactStore` (`@dxos/pipeline-rdf`) and `BrainService` (`@dxos/plugin-agent`) are deprecated in its favour.

The fact model and its RDF mapping move from `@dxos/pipeline-rdf` to `@dxos/echo-memory` (breaking): import `Fact` from `@dxos/echo-memory` (ids are now branded; build hand-written facts with `Fact.make`), and `Graph`, `Mapping`, `Ontology`, `Predicate`, `Vocab` and `hashText` from `@dxos/echo-memory/rdf`. `pipeline-rdf` no longer exports `RDF` or the `./types` subpath; `ExtractDocument`, `ExtractOptions` and `KnownEntity` are top-level exports.

`@dxos/sparql-sqlite` adds `SqlSparqlEngineAsync` and the log-first `QuadStore` (`@dxos/sparql-sqlite/async`), TriG and binary serializers (`@dxos/sparql-sqlite/exchange`), and a table prefix so several stores share one database. `FeedProtocol.WellKnownNamespaces` adds `facts`.
