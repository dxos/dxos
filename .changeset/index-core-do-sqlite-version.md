---
'@dxos/echo': patch
---

The index opens on Cloudflare Durable Object SQLite again. The SQLite version check added with the SQL query executor called `sqlite_version()`, which Durable Objects refuse. That failed every index migration and every query against the index. The check is now skipped where that function is denied.
