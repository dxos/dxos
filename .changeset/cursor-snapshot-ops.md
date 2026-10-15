---
'@dxos/echo': patch
---

`Cursor.writeSnapshot` no longer rewrites a connector cursor's whole snapshot map on every call, and skips writes whose snapshot is unchanged. GitHub, Linear and Trello syncs had grown cursors to tens of millions of Automerge operations, enough to run Composer out of WASM memory.
