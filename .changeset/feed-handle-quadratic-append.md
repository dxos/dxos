---
'@dxos/echo-client': patch
---

Fix quadratic-time feed append: `FeedHandle` was rebuilding its entire working-set array and id set on every append call, so appending N items to a feed cost O(n²) instead of O(n).
