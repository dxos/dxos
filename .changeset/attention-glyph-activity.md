---
'@dxos/react-ui-attention': minor
'@dxos/react-ui': patch
'@dxos/ui-types': minor
'@dxos/app-toolkit': minor
---

`AttentionGlyph` draws activity in four slots (fill, mark, edge and corner) from a `treatments` prop. A treatment describes how it draws: its slot, a hue, a shape or icon for the mark, whether the edge is dashed, a priority that decides which treatment wins its slot, and whether it animates. The glyph still animates at most one slot. The navtree glyph shows the progress monitors keyed to an object (`<uri>#<suffix>`, read with the new `useObjectProgressMonitors` hook): a pulsing star while one runs and a red edge when one fails. The assistant reports each agent turn this way, on its chat and on the object a companion chat accompanies. Breaking: the glyph's `presence` and `syncing` props are removed; pass `treatments` instead. `@dxos/ui-types` exports `Hue`, the theme's named colours, which `Icon`'s `IconHue` now aliases; `Icon` also accepts the `primary` hue.
