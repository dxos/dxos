---
'@dxos/react-ui-attention': minor
---

`AttentionGlyph` draws activity in four slots (fill, mark, edge and corner) from a `treatments` prop, and plugins report activity on an object through `AppCapabilities.ActivitySource`. The navtree glyph shows the agent star while an assistant chat, or a companion chat on the object, is working. Breaking: the glyph's `presence` and `syncing` props are removed; pass `treatments` instead.
