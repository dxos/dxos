---
'@dxos/app-graph': patch
'@dxos/plugin-navtree': patch
---

A navtree drop no longer paints a frame with the moved item still in its old place. Graph update flushes share a 5 ms per-frame budget, and under load the drop's own work used it up, so the move landed a frame late. `AppGraph.flushBeforePaint()` lifts the budget until the current task ends, and the navtree drop handler calls it before moving the item, so the first frame after a drop shows the result.
