---
'@dxos/echo-host': minor
---

A paged feed read (`orderBy(Order.natural(…)).skip(k).limit(n)` over a feed) now loads only the `n` documents it returns instead of loading `k + n` and dropping `k`: the planner folds the skip into the feed scan, and the index applies it as `OFFSET` before any document loads.

`QueryPlan.FeedScan` gains `skip`, and the plan no longer carries a `SkipStep` after such a scan, so a consumer that executes plans itself must pass `feedScan.skip` into its window (`NaturalQueueWindow` in `@dxos/index-core` gains `skip`) or it returns the first `n` rows instead of the page.
