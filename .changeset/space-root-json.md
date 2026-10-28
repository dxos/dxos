---
'@dxos/echo': patch
---

A space root that holds only links now opens without loading Automerge: the client reads it from JSON, served by the host from a new SQLite cache (`DataService.getDirectorySnapshot`) or kept in the boot cache, and loads the root's CRDT only when it writes to it. Host updates to an unloaded root carry its directory JSON, so routing stays current without a load. The boot cache format moves to version 2.
