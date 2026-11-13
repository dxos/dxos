---
'@dxos/echo': patch
---

A space whose root directory holds only links now opens without loading that root into Automerge, on the host or the client. The host's index keeps each root's directory JSON in SQLite, and a client is sent the root's stored changes with that JSON, or reads both from the boot cache. The root loads only when something writes to it or it changes. A root that still holds inline objects, or whose directory JSON is over 8 MiB, loads as before. The boot cache format moves to version 2.
