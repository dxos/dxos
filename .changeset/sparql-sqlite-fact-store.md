---
'@dxos/pipeline-rdf': minor
---

The RDF fact store now runs on `@dxos/sparql-sqlite`, which compiles SPARQL to SQLite and keeps literal datatypes. `FactStoreLive.layer` and `FactStoreLive.make` take a synchronous SQLite handle (`SqlStorage`) instead of an Effect `SqlClient`, Comunica is removed, and existing fact tables are dropped on first open.
