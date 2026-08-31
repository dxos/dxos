---
'@dxos/hypercore': minor
---

**Breaking:** `createCodecEncoding` now takes a structural `ValueCodec<T>` (`encode`/`decode`) and no longer accepts a second `EncodingOptions` argument, which only ever carried protobuf.js's `preserveAny`. Pass any object with `encode`/`decode`; no caller passed the options argument. `@dxos/hypercore`, `@dxos/feed-store` and `@dxos/client-services` no longer depend on `@dxos/codec-protobuf`.
