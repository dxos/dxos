---
'@dxos/echo-host': patch
'@dxos/echo-protocol': patch
---

Quarantine documents whose load runs out of memory instead of hanging the worker, rebuild them from the index, and retire them through the space directory so every peer wipes its copy. Sync cursors whose history has outgrown their state are retired the same way before they stop loading, and any document past 1M changes or ops logs an `oversized automerge document` warning.
