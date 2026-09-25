---
'@dxos/echo': patch
---

Replace client-side polling of feed content with a real streaming RPC (`FeedService.subscribeFeed`): the host now pushes a fresh object-set snapshot when the feed actually changes, instead of the client asking on a timer.
