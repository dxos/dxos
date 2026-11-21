# @dxos/sparql-sqlite

## 0.18.0

### Patch Changes

- @dxos/errors@0.18.0
  - @dxos/invariant@0.18.0

## 0.17.0

### Minor Changes

- 54ceffb: Add `MemoryService` in the new `@dxos/echo-memory`, with its memory core `RdfMemory` in `@dxos/echo-memory-sqlite`. A memory runs over the `RdfStore` port: SPARQL reads, batches of quad writes, and bulk export and import as TriG or a compact binary form. In the app, the client services host keeps each space's store in its own database, logged to the space's `facts` feed, which replicates like any feed (its format is echo-memory's `FactFeed`), and runs the space's memory beside it. `client.memory(spaceId)` returns that memory and `client.rdf(spaceId)` the store; operations that list `MemoryService` in their `services` get the space's memory. `FactStore` (`@dxos/pipeline-rdf`) and `BrainService` (`@dxos/plugin-agent`) are deprecated in its favour.

  The fact model and its RDF mapping move from `@dxos/pipeline-rdf` to `@dxos/echo-memory` (breaking): import `Fact` from `@dxos/echo-memory` (ids are now branded; build hand-written facts with `Fact.make`), and `Graph`, `Mapping`, `Ontology`, `Predicate`, `Vocab` and `Hash` (`hashText` is now `Hash.text`) from `@dxos/echo-memory` too; like `@dxos/echo`, each module is also a subpath (`@dxos/echo-memory/Fact`). `pipeline-rdf` no longer exports `RDF` or the `./types` subpath; `ExtractDocument`, `ExtractOptions` and `KnownEntity` are top-level exports.

  `@dxos/sparql-sqlite` adds `SqlSparqlEngineAsync` and the log-first `QuadStore` (`@dxos/sparql-sqlite/async`), TriG and binary serializers (`@dxos/sparql-sqlite/exchange`), and a table prefix so several stores share one database. `FeedProtocol.WellKnownNamespaces` adds `facts`. plugin-agent's `FactFeed`/`FactItem` and the `AddFactFeed`/`RemoveFactFeed`/`ListFactFeeds` operations are removed, and so are the `EdgeHttpClient` brain fact-feed calls; a Discord back-index now writes its facts to the space's memory.

### Patch Changes

- @dxos/errors@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- @dxos/errors@0.16.0
  - @dxos/invariant@0.16.0

## 0.15.0

### Patch Changes

- @dxos/errors@0.15.0
  - @dxos/invariant@0.15.0
