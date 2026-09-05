# @dxos/hypercore

## 0.12.0

### Minor Changes

- 4bac701: **Breaking:** `createCodecEncoding` now takes a structural `ValueCodec<T>` (`encode`/`decode`) and no longer accepts a second `EncodingOptions` argument, which only ever carried protobuf.js's `preserveAny`. Pass any object with `encode`/`decode`; no caller passed the options argument. `@dxos/hypercore`, `@dxos/feed-store` and `@dxos/client-services` no longer depend on `@dxos/codec-protobuf`.

  Devtools and mesh presence move further onto buf: `PeerState` is now produced as a buf message by the gossip extension, `SignalResponse`, `SubscribeToSpacesResponse`, `LogEntry` and `QueryLogsRequest` are exposed as buf types, and the last top-level protobuf enum imports (`EdgeReplicationSetting`, `ConnectionState`) move with them. Wire formats are unchanged.

### Patch Changes

- Updated dependencies [e8088ea]
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/random-access-storage@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/typings@0.12.0
  - @dxos/vendor-hypercore@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/crypto@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/node-std@0.11.1
- @dxos/random-access-storage@0.11.1
- @dxos/typings@0.11.1
- @dxos/util@0.11.1
- @dxos/vendor-hypercore@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [6a03a30]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/random-access-storage@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
  - @dxos/typings@0.11.0
  - @dxos/vendor-hypercore@0.11.0
