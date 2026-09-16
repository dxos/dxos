---
'@dxos/feed-store': minor
'@dxos/teleport-extension-replicator': minor
'@dxos/client-services': minor
'@dxos/hypercore': minor
---

Rename the hypercore-specific `feed` naming to `hypercore`, so that `feed` is left to the unrelated ECHO feed concept.

**Breaking:** `@dxos/feed-store` renames every export. `FeedStore` → `HypercoreStore`, `FeedWrapper` → `HypercoreWrapper`, `FeedFactory` → `HypercoreFactory`, `FeedQueue` → `HypercoreQueue`, `FeedIterator` / `FeedSetIterator` → `HypercoreIterator` / `HypercoreSetIterator`, `FeedWriter` → `HypercoreWriter`, `FeedBlock` → `HypercoreBlock`, `FeedIndex` → `HypercoreIndex`, `FeedOptions` → `HypercoreCreateOptions`, along with the Effect services and layers, and the `openFeed` / `createFeed` / `addFeed` / `hasFeed` / `getFeed` methods. There are no compatibility re-exports.

`@dxos/hypercore` renames `HypercoreFactory` to `RawHypercoreFactory`, freeing the unqualified name for the store-level factory.

Stored data and the wire protocol are untouched: protobuf messages, credential assertions and serialized property names such as `feedKey` keep their names.
