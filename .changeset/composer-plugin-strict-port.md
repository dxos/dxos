---
'@dxos/app-framework': patch
---

`composerPlugin`'s dev and preview servers now fail when their port is taken instead of moving to the next free one, so Composer's Dev Server setting never loads a plugin from whatever else holds port 3967.
