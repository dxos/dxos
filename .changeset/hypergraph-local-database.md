---
'@dxos/echo': minor
---

`Hypergraph.localDatabase(name)` returns a device-local `Database` that never replicates and is not a space; the same name reopens the same objects. Storage is pluggable through `Hypergraph.LocalDatabaseFactory` (`EchoClient`'s new `localDatabaseFactory` option), and `@dxos/echo-sqlite` provides a SQLite-backed one. Implementers of `Hypergraph.Hypergraph` must add the method.
