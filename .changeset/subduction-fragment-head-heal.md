---
'@dxos/echo': patch
---

Fix documents that stayed one edit behind EDGE after a reconnect: a client now asks EDGE to push documents its own sync rounds cannot bring up to date.
