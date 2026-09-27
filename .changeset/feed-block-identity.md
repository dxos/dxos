---
'@dxos/echo': minor
---

Feed readers now recognise blocks by the id and position each store stamps into an object's `@meta`, instead of hashing object content. A re-read of an object that has not changed no longer decodes or hashes it. `subscribeFeed` now sends the whole feed once, then only new blocks and position changes. Breaking for `FeedService` implementers: `insertIntoFeed` now returns `InsertIntoFeedResponse`, with the id of each written block when the store stamps them.
