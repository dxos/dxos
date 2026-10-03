---
'@dxos/echo': patch
---

Cut the SQLite writes an agent turn causes by about a third: an indexing pass writes each batch to its snapshot and reverse-reference indexes in one transaction instead of two, and trace messages reach their feed in batches rather than one transaction per message.
