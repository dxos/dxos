# @dxos/protocols

## 0.11.0

### Minor Changes

- 962c8cd: Delete the redundant `dxos.iframe.WorkerService` protobuf service (and its `StartRequest` message) now that the tab→worker control channel is defined and served via effect-rpc (`WorkerService` in `@dxos/protocols/rpc`, over the app `MessagePort`). Also removes the now-unused `iframeServiceBundle` and `workerServiceBundle` exports from `@dxos/client-protocol` (they had no consumers). The `dxos.mesh.bridge.BridgeService` and `dxos.iframe.AppService`/`ShellService` protobuf definitions are retained — they are still used by the WebRTC transport bridge and the shell↔app iframe transport respectively.
- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- 114fb98: Fix corruption of large query results containing emoji or other astral characters. The `QueryService` RPC now encodes its payloads with Effect schemas instead of protobuf, avoiding a `@protobufjs/utf8` bug that injected a lone surrogate into string fields larger than 8KB and broke object hydration.
- b591791: Add an in-app `@dxos/log` viewer (new `@dxos/react-ui-debug` `LogPanel`) so logs can be filtered, level-configured, and copied without opening DevTools; plugin-debug surfaces it as an R0 companion tab and a status-bar popover, and the devtools performance panel reuses the same component. Make the devtools `subscribeToFeeds`/`subscribeToSpaces` `feedKeys`/`spaceKeys` payload fields optional, fixing a Storage-panel schema decode error on empty subscriptions. Reimplement the devtools performance `Panel` and `PanelContainer` on the shared `@dxos/react-ui` `Panel` primitive.
- Updated dependencies [6a03a30]
  - @dxos/keys@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
