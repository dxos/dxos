---
'@dxos/react-ui-canvas': patch
'@dxos/plugin-canvas': patch
---

Lattice cells now cover the visible view as well as the scene's frame, since shapes may land on free cells beyond it, and gutter routing searches past every shape's frame so a link finds its way round a wide shape. `SceneBuilder.build()` throws on a duplicate node or link id instead of silently keeping the last. The canvas article shows the properties panel for the selection. Canvas content records are Effect schemas (`ContentRecord`, discriminated by `kind`), and the root scene's id is `root`, so its key is `scene:root` rather than the doubled `scene:scene:root`; a drawing saved with the old id is migrated in place the first time it is opened.
