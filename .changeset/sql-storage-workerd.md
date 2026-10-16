---
'@dxos/sql-sqlite': patch
---

`@dxos/sql-sqlite/SqlStorage` gains a `workerd` variant, so a Cloudflare Worker bundle no longer carries wa-sqlite (about 190 KB of a bundle that imports `@dxos/pipeline-rdf`). wa-sqlite could not run there anyway, because a Worker bundle has no way to ship its wasm. In workerd, `makeMemory` and `makeFile` fail with a `SqlError` that names a Durable Object's `ctx.storage.sql` as the database to pass instead.
