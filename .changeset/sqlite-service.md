---
'@dxos/compute': minor
---

Add `SqliteService`: operations and processes declare it and call `SqliteService.database({ name })` for an Effect `SqlClient`. Locally it runs on the client services host, which rejects statements that touch SQLite internals, host tables or another database's tables, and connection-level commands such as `PRAGMA`, `ATTACH` and transactions.
