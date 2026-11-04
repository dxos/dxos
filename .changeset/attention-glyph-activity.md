---
'@dxos/react-ui-attention': minor
'@dxos/react-ui': patch
'@dxos/ui-types': minor
'@dxos/app-toolkit': minor
---

`AttentionGlyph` draws activity in four slots (fill, mark, edge, corner) from a `treatments` prop; each treatment names its slot, hue, mark, priority and whether it animates, and at most one slot animates. The navtree glyph shows the progress monitors keyed `<uri>#<suffix>` to an object (new `useObjectProgressMonitors` hook): a pulsing star while one runs, a red edge when one fails. The assistant reports each agent turn on its chat and on a companion chat's subject. Breaking: the glyph's `presence` and `syncing` props are removed; pass `treatments`. `@dxos/ui-types` exports `Hue`, which `IconHue` aliases; `Icon` accepts the `primary` hue.
