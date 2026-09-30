---
'@dxos/app-graph': patch
'@dxos/plugin-navtree': patch
---

A navtree drop no longer paints a frame with the moved item still in its old place. Graph update flushes share a 5 ms per-frame budget, and under load the drop's own work used it up, so the move landed a frame late. Each app graph builder now owns its frame budget, and `AppGraphBuilder.flushBeforePaint(builder)` lifts it until the current task ends. The navtree drop handler calls it before moving the item, so the first frame after a drop shows the result.
