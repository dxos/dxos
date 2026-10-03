---
'@dxos/echo': patch
---

Reopening a profile no longer rewrites unchanged state to SQLite: hypercore feed files skip writes that leave their bytes as they are, the metadata record is saved only when something other than its timestamp changed, and a space restored with its saved root no longer re-saves its row.
