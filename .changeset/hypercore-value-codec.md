---
'@dxos/hypercore': minor
'@dxos/feed-store': patch
'@dxos/client-services': patch
---

`createCodecEncoding` now takes a structural `ValueCodec<T>` and no longer accepts protobuf.js `EncodingOptions`, so `@dxos/hypercore`, `@dxos/feed-store` and `@dxos/client-services` no longer depend on `@dxos/codec-protobuf`. No caller passed the options argument.
