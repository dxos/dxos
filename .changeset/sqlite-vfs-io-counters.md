---
'@dxos/sql-sqlite': patch
---

The OPFS SQLite client now counts the bytes and operations it performs against storage, exposed as `getSqliteIoStats()` and published on `globalThis.__dxosSqliteIo` for out-of-realm readers such as a measurement harness. Counting is unconditional and costs two integer increments per VFS call.
