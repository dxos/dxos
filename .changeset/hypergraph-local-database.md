---
'@dxos/echo': minor
---

`Hypergraph.localDatabase(name)` returns a device-local `Database` that never replicates; the same name reopens the same objects. It joins the graph like a space: `graph.getDatabase` finds it, graph queries scan, filter, order and traverse references and relations across it and the spaces, and references resolve in both directions. Storage is pluggable through `Hypergraph.LocalDatabaseFactory` (`EchoClient`'s new `localDatabaseFactory` option), and `@dxos/echo-sqlite` provides a SQLite-backed one. Implementers of `Hypergraph.Hypergraph` must add the method, and `HypergraphImpl.getDatabase` now returns `Database.Database`.
