---
'@dxos/sql-sqlite': patch
---

OPFS SQLite connections raise the page cache from SQLite's 2 MB default to 32 MiB (`PRAGMA cache_size`), so repeat queries on a large database read cached pages instead of re-reading them from OPFS. The cache grows only as pages are read, so a smaller database costs only its own size.
