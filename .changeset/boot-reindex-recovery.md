---
'@dxos/echo': patch
'@dxos/plugin-space': patch
---

Spaces load after an upgrade that reindexes the database, instead of staying empty until a reload.

- `@dxos/context`: a `Resource` whose `_open` throws is left closed with that attempt's context disposed, so a later `open()` tries again. Before, the rejected open was kept and every later `open()` rethrew it.
- `@dxos/echo-host`: a compiled query waits for indexing only when the snapshot store is missing rows the query can read: rows of its own spaces, and feed rows only for queries that read feeds. One feed row without a snapshot no longer made every query wait out a whole reindex.
- `@dxos/echo-client`: the schema preload on database open is best effort, so a slow index no longer fails the open.
- `@dxos/client`: a space whose initialization failed retries with backoff (1 s doubling to 30 s) while it stays ready.
- `@dxos/plugin-space`: settings sync binds to the settings space off the activation path and retries, so a slow settings space no longer fails the plugin's activation.
