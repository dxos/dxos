---
'@dxos/app-graph': patch
'@dxos/plugin-navtree': patch
'@dxos/react-ui-list': patch
---

A navtree drop no longer paints a frame with the moved item still in its old place. Graph update flushes share a 5 ms per-frame budget, and under load the drop's own work used it up, so the move landed a frame late. Each app graph builder now owns its frame budget, and `AppGraphBuilder.flushBeforePaint(builder)` lifts it until the current task ends and flushes any updates an earlier flush left waiting. The navtree drop handler calls it before moving the item, so the first frame after a drop shows the result.

A dragged tree row's drag image is now translucent. The browser snapshots the row while it is hovered, so the image used to carry the solid hover fill and hide the drop indicator. The fill is 25% opaque while the snapshot is taken.
