---
'@dxos/hypercore': minor
'@dxos/plugin-debug': patch
---

**Breaking:** `createCodecEncoding` now takes a structural `ValueCodec<T>` (`encode`/`decode`) and no longer accepts a second `EncodingOptions` argument, which only ever carried protobuf.js's `preserveAny`. Pass any object with `encode`/`decode`; no caller passed the options argument. `@dxos/hypercore`, `@dxos/feed-store` and `@dxos/client-services` no longer depend on `@dxos/codec-protobuf`.

Devtools and mesh presence move further onto buf: `PeerState` is now produced as a buf message by the gossip extension, `SignalResponse`, `SubscribeToSpacesResponse`, `LogEntry` and `QueryLogsRequest` are exposed as buf types, and the last top-level protobuf enum imports (`EdgeReplicationSetting`, `ConnectionState`) move with them. Wire formats are unchanged.
