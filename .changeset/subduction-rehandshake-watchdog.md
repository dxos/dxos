---
'@dxos/echo': patch
---

A subduction connection whose in-place re-handshake never re-established the edge session now restarts instead of stalling, so a space whose root document was in flight when the edge dropped the session finishes opening rather than hanging indefinitely.
