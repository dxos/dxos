---
'@dxos/pipeline-rdf': minor
'@dxos/react-ui-rdf': minor
'@dxos/plugin-discord': patch
---

Fact reads no longer have to load the whole store to say anything about it. `FactStoreApi` gains `count`, `aggregate` and `entityLabels`, each compiled to one SPARQL statement over the quad store, and `SemanticQuery` gains a `limit` that caps the candidate graphs a read loads. `FactAnalyticsLive` wraps either a store or a plain fact array behind one `FactAnalytics` surface, so a view written once runs over a mailbox-sized store and over a fixture unchanged.

`@dxos/react-ui-rdf` adds two composites over that surface. `FactExplorer` is an aggregate-first overview — predicates and entities ranked, an entity × predicate cross-tab, and a capped fact list that states the true total — where clicking anything narrows the scope. `FactMemory` is the held-out-message view: an incoming message beside what the store already knew about the entities it mentions. `@dxos/pipeline-rdf/testing` gains `generateCorpus` and `splitCorpus`, a deterministic inbox-shaped corpus the stories are seeded with.

`@dxos/plugin-discord`'s write-only fact-feed store declines the three new reads, as it already declines `query` and `select`.
