# @dxos/messaging

## 0.11.0

### Minor Changes

- b3a3fcf: Unify the signaling `sendMessage`/`sendBroadcast` methods and encapsulate message-subscription routing.

  Breaking:
  - `SignalMethods.sendMessage(ctx, message)` now handles both point-to-point and swarm-broadcast (DX-1125) delivery. A message carries exactly one of `recipient` (point-to-point) or `tags` (broadcast, targeting the swarm in `author.swarmKey`); `Message.recipient` is now optional. The separate `sendBroadcast` method is removed.
  - `subscribeMessages({ peer, tags?, onMessage })` now takes the delivery callback, encapsulates routing (point-to-point by recipient, broadcasts by tag intersection), and returns an unsubscribe callback that owns the subscription lifecycle. The standalone `unsubscribeMessages` method and the `onMessage`/`onBroadcast` events are removed.
  - The `@dxos/signal` package (the KUBE signal-server test harness) has been removed; tests now use `MemorySignalManager`.
  - The KUBE signaling client is removed: `WebsocketSignalManager`, `SignalClient`, `SignalRPCClient`, `SignalLocalState`, and the `SignalClientMethods` interface no longer exist. Edge signaling (`EdgeSignalManager`) is the only real transport; the non-edge fallback in the services host / worker runtime / local client services is now `MemorySignalManager` (isolated, no cross-process signaling).

- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [6a03a30]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/log@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
