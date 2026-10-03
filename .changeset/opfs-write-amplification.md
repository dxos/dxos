---
'@dxos/echo-host': patch
---

Speed up local writes on OPFS: SQLite temp files now stay in memory, and Automerge chunk writes that arrive together commit in one transaction instead of one each, so a large flush no longer times out its RPC.
