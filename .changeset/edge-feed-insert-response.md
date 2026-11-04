---
'@dxos/protocols': patch
---

Functions hosted on EDGE can fork feed branches. `FeedService.insertIntoFeed` in `@dxos/functions-runtime-cloudflare` now passes on the block ids and predecessors that EDGE's queue service reports, instead of returning nothing, so `Feed.fork` confirms a branch on EDGE as it does on a client. `EdgeFunctionEnv.QueueService.insertIntoQueue` may resolve to that `InsertIntoFeedResponse`.
