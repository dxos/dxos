---
'@dxos/feed': patch
---

The OPFS SQLite clients no longer cache `PRAGMA` statements, which act when compiled, so repeating a setting such as `synchronous` applies it again.
