---
'@dxos/plugin-canvas': patch
---

The root scene's id is `root`, so its content key is `scene:root` rather than the doubled `scene:scene:root`. A drawing saved with the old id is migrated in place the first time it is opened.
