---
'@dxos/echo': patch
---

Live queries do less work on every database update: deletion checks across a result set share one walk of common ancestors, `childOf` filters share parent verdicts, index hits hydrate under one timer per batch instead of one per object, and space sync-state updates are throttled to two a second.
