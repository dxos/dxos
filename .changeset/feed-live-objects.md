---
'@dxos/echo': minor
---

Feed-backed objects are now live by default: `Obj.update` synchronously mutates and notifies subscribers, identity is stable across queries and re-appends, and updates persist as a background whole-object re-append. Direct property assignment on a feed-backed object outside `Obj.update` now throws instead of silently mutating in memory.
