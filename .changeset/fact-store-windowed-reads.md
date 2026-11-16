---
'@dxos/pipeline-rdf': minor
---

`FactStore` gains windowed reads, so a list over a large store loads only what it shows: `entities` answers a window of the entities the statements name (by label, filtered by kind, text, role and predicate) with the total and per-kind counts, `entityFacts` loads the facts naming some entities, and `predicateUsage` counts statements per predicate. The live SQLite store answers them from an index it builds on first use and drops on every write; `FactStoreHttp` carries them over the wire. They are optional on `FactStoreApi`; `isWindowed` tells whether a store has them.
