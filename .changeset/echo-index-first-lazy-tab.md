---
'@dxos/echo': minor
---

A space no longer loads every linked document into the client on open; documents load when a query or reference asks for them. `QueryResult.isComplete` reports whether the index has answered, and until it has, `results`, `runSync()` and `runSyncEntries()` hold only what the client has loaded, including objects created or updated locally. `subscribe(cb, { fire: true })` defers an empty initial event until the index has answered. On the host, a document subscribed by a client is no longer kept loaded for the life of the subscription, so idle documents are evicted under the host's residency policy, and pending client writes are sent when the page hides.
