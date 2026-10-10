---
'@dxos/echo': minor
---

Blobs written through the `edge` storage are now stored on the device first, in the client services database, and uploaded to EDGE in the background with retries; reads are served locally and cached from EDGE on a miss, so blobs work offline. The `edge` backend is registered and is the default storage even when no EDGE URL is configured, and `createEdgeBlobBackend` now requires a `local` store (`createMemoryBlobStore` from `@dxos/blob` for tests) and makes `transport` optional.
