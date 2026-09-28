---
'@dxos/echo-host': patch
'@dxos/feed': patch
'@dxos/client-services': patch
---

`EchoHost.updateIndexes` now runs an index pass only when something it reads has changed since the last pass began: a saved document, new feed blocks, or an unfinished batch. A request that finds nothing pending waits for any pass in flight and returns. In production traces 99.6% of passes were such requests, each re-reading every space's feed cursor and every document's heads to index nothing, at a median of 89 ms of worker time.

Requests are now attributed on the pass span: `rpc-update-indexes` for the client's `DataService.updateIndexes`, `feed-scoped-query` for a feed-scoped query opening, and `epoch` for epoch creation, instead of one label for all three.

`FeedStore` keeps each space's cursor token in memory after its first read, since the token is written once and every poll validated it with a query.
