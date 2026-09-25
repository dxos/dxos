---
'@dxos/echo': patch
---

Live queries that follow relations or parent/child links no longer rescan every loaded object at each traversal step. A query run now reads the database at most once.
