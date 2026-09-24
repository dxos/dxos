---
'@dxos/echo-host': patch
---

An EDGE replication connection whose Subduction handshake fails, or does not bind within 30 seconds (including an in-place re-handshake after EDGE drops the session), now restarts instead of staying open and silently syncing nothing until a reload.
