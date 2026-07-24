# @dxos/client-services

## 0.11.0

### Minor Changes

- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- da66270: Fix an unhandled `SqlError` when a hypercore file load races client teardown. If the SQLite connection is torn down while a background `SqliteRandomAccessFile` read is in flight (and that file's own `close()` hasn't run yet), the read now falls back to an empty buffer instead of rethrowing "database connection is not open" as an unhandled rejection.
- Updated dependencies [4e64123]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [ae18615]
- Updated dependencies [14983db]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [b3a3fcf]
- Updated dependencies [41141d8]
- Updated dependencies [da66270]
- Updated dependencies [08a3eea]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/echo-host@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/messaging@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/feed-store@0.11.0
  - @dxos/hypercore@0.11.0
  - @dxos/lock-file@0.11.0
  - @dxos/random-access-storage@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/feed@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/keyring@0.11.0
  - @dxos/network-manager@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/teleport@0.11.0
  - @dxos/teleport-extension-gossip@0.11.0
  - @dxos/teleport-extension-object-sync@0.11.0
  - @dxos/teleport-extension-replicator@0.11.0
  - @dxos/websocket-rpc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
