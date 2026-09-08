---
'@dxos/echo': patch
---

`Database.TypeId` now uses the registry key `@dxos/echo/Database/TypeId`. It previously shared `@dxos/echo/Database` with the `[ObjectDatabaseId]` accessor that every ECHO object carries, which made the two the same symbol and `Database.TypeId in obj` true for every object in the graph. `Database.isDatabase` was unaffected (it compares the value, not just the key), but a brand check written as a bare `in` test would have misfired.

Consumers that import `Database.TypeId` need no change. Only code that hard-coded `Symbol.for('@dxos/echo/Database')` to brand a database is affected.
