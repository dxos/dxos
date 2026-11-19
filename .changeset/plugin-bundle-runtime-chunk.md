---
'@dxos/app-framework': patch
---

`composerPlugin` keeps Rolldown's runtime helpers in a chunk of their own, so a plugin bundle's workerd modules no longer import React through a browser chunk that happened to hold them.
