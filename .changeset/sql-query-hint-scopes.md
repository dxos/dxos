---
'@dxos/echo': patch
---

Live queries evaluated in SQLite now skip re-running on writes that cannot affect them. A compiled query previously re-ran on every write, so a large feed query (such as a space's trace messages) made unrelated edits take seconds.
