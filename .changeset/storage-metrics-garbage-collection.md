---
'@dxos/echo': minor
---

Add per-space storage metrics and garbage collection to the ECHO `Database`. `db.stats()` reports live/deleted object counts, automerge document count, and feed/feed-block counts; `db.runGarbageCollection()` unlinks soft-deleted objects from the space directory, wipes the automerge documents they leave orphaned, and clears the corresponding index entries. Both are routed through the data service so they work against local and remote hosts. See the garbage-collection design notes in `@dxos/echo-host`.
