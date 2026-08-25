---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Add an agent debug port to the devtools hook (`dxos.debugPort`) that evaluates snippets delivered by a loopback server, and surface start/stop plus the session id in the Debug plugin's settings. Off by default, activated only by an explicit gesture, and never persisted.
