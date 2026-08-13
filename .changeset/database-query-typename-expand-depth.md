---
'@dxos/assistant-toolkit': minor
---

The `database.query` typename filter now matches every version of a typename, and every schema registered under it — the space's own stored schemas as well as the static registry. A filter built from a single resolved schema matched exactly: a static schema carries a versioned DXN, so objects written before a schema bump were invisible, and a space-local schema resolves to an EID, so user-defined types were unfilterable altogether. An unknown typename now returns no results instead of failing the call.

`database.query` and `database.load` accept `expandDepth` (default `0`, maximum `1`): referenced objects are inlined in place of their `{ "/": "echo:..." }` envelope, so reading a document with its content, or a task with its assignee, no longer costs a second `load` call. A reference that fails to resolve is left as its envelope.
