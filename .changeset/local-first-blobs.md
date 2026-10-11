---
'@dxos/echo': minor
---

Blobs written through the `edge` storage are now stored on the device first, in the client services database, and a write is confirmed as soon as it is stored there. When an EDGE URL is configured, the client services host replicates stored blobs to EDGE asynchronously and fills local misses from it; without one, clients store and read blobs locally, and the `edge` backend is the default storage either way. `createEdgeBlobBackend` now takes a `store` (`createMemoryBlobStore` from `@dxos/blob` for tests) and an optional `finalizeUpload` instead of a transport; replication lives in `createBlobReplicator` and `withReadThrough` in `@dxos/blob/hosted`.
