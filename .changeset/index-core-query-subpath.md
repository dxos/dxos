---
'@dxos/index-core': minor
---

Add a `@dxos/index-core/query` entry with the query-building helpers and without `IndexEngine`. `@dxos/echo-client` and the `@dxos/echo-host` query and filter entries import it, so an app that bundles the ECHO client no longer statically reaches the indexing engine.
