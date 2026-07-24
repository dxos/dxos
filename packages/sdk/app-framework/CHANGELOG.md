# @dxos/app-framework

## 0.11.0

### Minor Changes

- 2048cb3: Replace `Surface.isAvailable` with `Surface.useIsAvailable`, a hook returning a stable, memoized function. Surfaces and graph extensions with an invalid (non-camelCase) local id are now dropped with a warning instead of throwing and crashing plugin activation.
- 08a3eea: Plumb ephemeral trace events through the swarm (DX-1125).

  Adds tag-based broadcast pub/sub over the existing swarm messaging layer (spec 1): a message may carry `tags` instead of a single `recipient`, and a subscriber registers a tag set and receives any broadcast whose tags intersect (logical OR). New wire fields (`signal.Message.tags`, `signal.SubscribeMessagesRequest`, `messenger.Message.tags`, `SwarmRequest.SUBSCRIBE`/`subscribe_tags`) and a dedicated `onBroadcast` channel keep broadcasts off the point-to-point path.

  On top of that (spec 2), remote runtimes broadcast their ephemeral trace messages so clients can watch live progress: `Trace.messageToTags`/`Filter`/`matchesFilter`/`encodeTraceMessage`, a `SwarmTraceSink` producer, `Process.Monitor.subscribeToTraceMessages(filter)`, a `RemoteTraceMonitor` swarm source merged into the aggregate monitor, and a plugin-client consumer that projects remote `status.update` events into the progress registry.

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [1a9bca1]
- Updated dependencies [bf013a1]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [717edc0]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [4df6cf3]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/compute-runtime@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/operation@0.11.0
  - @dxos/react-error-boundary@0.11.0
  - @dxos/react-hooks@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/storybook-addon-logger@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/web-context@0.11.0
  - @dxos/web-context-react@0.11.0
