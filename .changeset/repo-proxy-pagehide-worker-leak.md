---
'@dxos/echo': patch
---

A database client that is never closed no longer stays in memory for the life of a Cloudflare Workers isolate: the client registers its `pagehide` listener only where a page exists.
