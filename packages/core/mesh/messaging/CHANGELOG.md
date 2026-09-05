# @dxos/messaging

## 0.12.0

### Patch Changes

- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [4e417e9]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [3e02201]
- Updated dependencies [dde6714]
- Updated dependencies [e56276b]
- Updated dependencies [5ceaf9c]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [f8bfba0]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [85e6347]
  - @dxos/protocols@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/log@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/context@0.11.1
- @dxos/credentials@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/rpc@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1

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
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
