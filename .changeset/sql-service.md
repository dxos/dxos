---
'@dxos/compute': minor
---

Add `SqlService`: operations and processes declare it and call `SqlService.database({ name })` for an Effect `SqlClient`, including `withTransaction`. Locally it runs on the client services host, which rejects statements that touch SQLite internals, host tables or another database's tables, and connection-level commands such as `PRAGMA` and `ATTACH`.
