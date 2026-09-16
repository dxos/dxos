---
'@dxos/hypercore-store': major
'@dxos/teleport-extension-replicator': minor
'@dxos/client-services': minor
'@dxos/hypercore': minor
---

Rename the hypercore-specific `feed` naming to `hypercore`, so that `feed` is left to the unrelated ECHO feed concept.

- `@dxos/feed-store` is renamed to `@dxos/hypercore-store`. Every exported symbol follows: `FeedStore` → `HypercoreStore`, `FeedWrapper` → `HypercoreWrapper`, `FeedFactory` → `HypercoreFactory`, `FeedQueue` → `HypercoreQueue`, `FeedIterator` / `FeedSetIterator` → `HypercoreIterator` / `HypercoreSetIterator`, `FeedWriter` → `HypercoreWriter`, `FeedBlock` → `HypercoreBlock`, and the `openFeed` / `createFeed` / `addFeed` / `hasFeed` / `getFeed` methods gain the same prefix. There are no compatibility re-exports.
- `@dxos/hypercore` renames `HypercoreFactory` to `RawHypercoreFactory`, freeing the unqualified name for the store-level factory.
- Stored data and the wire protocol are untouched: protobuf messages, credential assertions and serialized property names such as `feedKey` keep their names.
