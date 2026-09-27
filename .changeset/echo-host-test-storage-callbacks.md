---
'@dxos/echo-host': patch
---

Let a test wait for an automerge chunk to reach SQLite: `createTestSqliteStorageAdapter` now takes `SqliteStorageCallbacks`, whose `afterSave` fires once a write has landed.
