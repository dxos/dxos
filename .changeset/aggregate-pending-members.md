---
'@dxos/echo': patch
---

A one-shot aggregate query (`Query.select(...).aggregate(...)` then `run()`) no longer comes back empty, or short, when it runs while the objects it counts are loaded but their strong dependencies are still resolving. The client dropped the index's count for those objects, expecting to recount them locally, but local evaluation skips them until their dependencies are satisfied, so they were counted nowhere.
