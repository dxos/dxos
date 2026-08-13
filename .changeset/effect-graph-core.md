---
'@dxos/echo': minor
---

Rebuilt `@dxos/graph`'s `GraphModel` on Effect's `Graph` as the canonical in-memory representation. Adds granular per-node and per-edge atom views, `batch()` for single-notification mutation groups, `reload()`/`sync()` for changes originating in a backing store, and the `topoLevels` and `findCycle` algorithms. `ReadonlyGraphModel` and `ReactiveGraphModel` are merged into `AbstractGraphModel`, and model constructors now take an options bag (`{ registry, graph, change }`).
