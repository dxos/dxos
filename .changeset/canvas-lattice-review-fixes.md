---
'@dxos/react-ui-canvas': patch
---

Lattice cells now cover the visible view as well as the scene's frame, since shapes may land on free cells beyond it. Gutter routing searches past every shape's frame, so a link finds its way round a wide shape instead of falling back to a route through it. `SceneBuilder.build()` throws on a duplicate node or link id instead of silently keeping the last.
