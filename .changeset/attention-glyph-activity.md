---
'@dxos/react-ui-attention': minor
'@dxos/react-ui': patch
'@dxos/ui-types': minor
---

`AttentionGlyph` draws activity in four slots (fill, mark, edge and corner) from a `treatments` prop, and plugins report activity on an object through `AppCapabilities.ActivitySource`. A treatment describes how it draws: its slot, a hue, a shape or icon for the mark, whether the edge is dashed, a priority that decides which treatment wins its slot, and whether it animates. The glyph still animates at most one slot. The navtree glyph shows a pulsing star while an assistant chat, or a companion chat on the object, is working. Breaking: the glyph's `presence` and `syncing` props are removed; pass `treatments` instead. `@dxos/ui-types` exports `Hue`, the theme's named colours, which `Icon`'s `IconHue` now aliases; `Icon` also accepts the `primary` hue.
