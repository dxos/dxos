---
'@dxos/echo': patch
---

A device that joins a space no longer stays stuck initializing when EDGE's router drops a feed-replication frame. `EdgeFeedReplicator` asked EDGE for each feed's length once per connection, so a lost `get-metadata` reply left the feed's remote length unknown and the feed was never pulled. The same went for a lost `request` reply, whose blocks were treated as already requested. The space waited on credentials it would never receive until the socket reconnected. Feeds still behind EDGE are now asked about again, with backoff.
