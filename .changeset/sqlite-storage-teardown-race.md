---
'@dxos/client-services': patch
---

Fix an unhandled `SqlError` when a hypercore file load races client teardown. If the SQLite connection is torn down while a background `SqliteRandomAccessFile` read is in flight (and that file's own `close()` hasn't run yet), the read now falls back to an empty buffer instead of rethrowing "database connection is not open" as an unhandled rejection.
