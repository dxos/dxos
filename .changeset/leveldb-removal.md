---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Remove LevelDB and the `@dxos/kv-store` package. Automerge document storage, heads, and the query index are now backed exclusively by SQLite. Profile export/import no longer reads or writes a LevelDB store — legacy `KEY_VALUE` archive entries are skipped on import.
