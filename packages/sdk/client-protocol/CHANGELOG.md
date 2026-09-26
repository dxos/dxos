# @dxos/client-protocol

## 0.12.0

### Minor Changes

- fd23a8b: Dissolve `ClientServicesHost` and drive the client-services runtime through Effect layers and an in-process hook controller.

  - `@dxos/effect` gains a `Hook` module (`Hook.make`, `Hook.on`, `Hook.handler`, `Hook.subscribe`, `Hook.emit`, `Hook.Controller`, `Hook.makeController`, `Hook.controllerLayer`). `emit` awaits every handler, so an emit doubles as a barrier for the work it triggers.
  - `@dxos/client-services` replaces the hand-maintained open/close sequences with a lifecycle event chain (`StorageReady → IdentityLoaded → NetworkReady`, `IdentityBound`, `IdentityAvailable → DataSpacesReady`, `StackOpened`, plus `NetworkingEnabled`, `ProfileUpdated` and the `Closing → WipingStorage → Reset` chain). Each component opens on the event it depends on and closes in its layer finalizer, so open order comes from event causality and teardown from scope disposal. Platform inputs (edge clients, signal manager, transport factory) move into `ClientPlatformLayer`; logging, devtools and system services become stack layers with a push-based system status.
  - `ClientServicesHost` is gone: `ClientServicesLayer` composes the whole runtime, and `LocalClientServices`, the worker runtime and the test builder each compose the stack directly over a single runtime and their own SQLite layer.
  - `@dxos/worker-framework` owns session lifetime: the runtime scope lives until shutdown, a session scope is forked from it and closed when the tab releases its session lock, is superseded, or the worker shuts down. `WorkerSession` is inlined into the worker runtime as a scoped effect.
  - `WorkerService` is removed from `@dxos/protocols` and `@dxos/client-protocol`; tab↔worker session control is the framework's own protocol. `@dxos/client-protocol` adds `Rpc.serverLayer` / `layerClientServicesServer`, an effect-native RPC server over the ambient protocol. `@dxos/rpc` adds `RpcRouter`, which serves several rpc groups that come and go over one protocol, routing by longest tag prefix.
  - `@dxos/protocols` exports `normalizeHandlers`, which keys a class-backed implementation's rpc methods by tag and binds them. `RpcGroup.toLayer` otherwise reads own-enumerable properties and effect-rpc calls what it stored unbound, so serving a service tag directly hung every request whose handler touched `this` — including the status stream a tab waits for on boot. `@dxos/client-protocol` serves each service through `layerHandlersFromTag`, which applies it.
  - `@dxos/feed-store` closes the store from its layer finalizer rather than from the host.
  - Removes the `locks` packlet and the `@dxos/lock-file` dependency, and fixes an import cycle that left the bundled `@dxos/client-services` unable to build its RPC layer.

- 4e417e9: Delete the protobuf `service {}` definitions for `ContactsService`, `EdgeAgentService`,
  `DevicesService`, `NetworkService`, `InvitationsService`, `IdentityService`, `SystemService`,
  `LoggingService`, `FeedService`, and `QueryService` from `dxos/client/services.proto`,
  `dxos/client/logging.proto`, `dxos/client/feed.proto` (file removed entirely), and
  `dxos/echo/query.proto`, now that all ten are served entirely over `@effect/rpc`. Message
  types still shared outside the RPC boundary (`ContactBook`, `QueryEdgeStatusResponse`,
  `QueryAgentStatusResponse`, `Device`, `Invitation`, `Identity`, `NetworkStatus`, `Platform`,
  `LogEntry`, and the `QueryService` request/response types, among others) are unaffected and
  remain protobuf-encoded on the wire. Consumers that imported a generated proto service
  interface type for any of these ten services must use `@dxos/protocols/rpc`'s effect-rpc
  definitions instead. `@dxos/client-protocol`'s deprecated `ClientServices` map keeps its existing entries'
  signatures — each is now backed by a hand-written Promise/`Stream` interface with the same
  shape as before — except `ClientServices['ContactsService']`, which had no consumers and is
  removed.
- 2df0297: Client service RPCs are registered with an `RpcRouter` at the bottom of the client-services layer stack instead of being enumerated per connection.

  `RpcRouter` is now a registry of rpc groups that any number of transports serve: `RpcRouter.layer` provides it with no transport, `RpcRouter.layerTransport` attaches the ambient `RpcServer.Protocol`, and a group registered before or after a transport is attached is served either way. A registration can carry an in-process client, and `RpcRouter.client` merges those into one tag-keyed surface with no wire hop.

  Each service registers itself: `RegisterService(rpc, tag)` (`@dxos/client-protocol`) is a layer requiring the service's handler tag and the router, kept separate from the layer that creates the handler. `ServiceStack` is now the whole stack — the components with the RPC services over them — so the per-connection lists are gone along with `layerClientServicesServer`, `layerHandlersFromTag` and `handlersFromStack`: a worker session builds `RpcRouter.layerTransport` over its protocol, and in-process consumers (`LocalClientServices`, diagnostics, tests) source their handlers from the router through `makeClientServicesRpcFromRouter`. `SystemService` depends on the router rather than on every other service tag.

  Also in this change:

  - One open/close state machine backs every transport server in `@dxos/client-protocol`'s `Rpc`, so concurrent opens cannot build two runtimes and a close during startup disposes the runtime that startup created.
  - `normalizeHandlers` resolves each method per call, so an implementation replaced after registration serves subsequent requests.
  - `ServiceContext.services` (test builder) is replaced by the scoped `ServiceContext.rpc`, and `TestBuilder.createClientServer` returns an `Rpc.GroupServer` served off the host's router.

- 3e08678: Rename the WebRTC bridge to `RTCService` and transfer the `RTCDataChannel` to the worker instead of relaying every packet through RPC.

  `RTCDataChannel` is a transferable object on every platform we support, so the tab now hands the established channel straight to the worker and the worker reads and writes it directly. Only signalling crosses the rpc boundary. `RTCService.open` takes the caller's end of a dedicated `MessageChannel` as part of its payload (transferred via effect's worker protocol) and posts the channel to it; the response stream is now purely a stream of signalling messages. The channel cannot ride that stream — a browser only allows an `RTCDataChannel` to be transferred in the task it was created in, and a stream chunk is encoded and sent a task later.

  Removed with it: the `sendData` rpc and its `DataRequest` message, the `BridgeEvent` data/connection-state events, and the duplex relay and manual backpressure callbacks that existed on both sides to carry them. The channel's own send buffer is now the only flow-control signal, applied by a single shared `bindDataChannel` helper used by the direct and proxied transports alike.

  A transferred channel does not deliver its events in the order the creating context would have seen, so that helper attaches the two directions separately: it starts reading on whichever of the first message or the `open` event arrives first, since dropping that first frame stalls the wire protocol's handshake for good, and it starts writing only once the channel is really open, since `send` throws while it is still connecting. A `*.browser.test.ts` suite covers the handover end to end against real Chromium WebRTC and a real worker, and unit tests pin each of those orderings.

  Breaking for embedders that wire the worker themselves:

  - `@dxos/protocols/rpc`: `BridgeService` → `RTCService`; its proto payloads moved from `dxos.mesh.bridge` to `dxos.mesh.rtc` and the `dxos.mesh.bridge.BridgeService` protobuf service is gone (the surface is effect-rpc only).
  - `@dxos/network-manager`: `RtcTransportService` → `RtcService`, now implementing the effect-rpc handlers directly; `RtcTransportProxyFactory.setBridgeService` → `setRtcService`, which takes an `RTCService.Client` rather than a proto-shaped service. `TransportKind.WEB_RTC_PROXY` is gone — the proxy transport needs a real browser now, so it is covered by the browser suite rather than the node `TestBuilder`.
  - `@dxos/client-protocol`: `serveBridgeService`/`makeBridgeServiceClient`/`makeBridgeServiceClientOverProtocol` → `serveRtcService`/`makeRtcServiceClient`/`makeRtcServiceClientOverProtocol`, the latter two now scoped effects rather than promises.
  - `@dxos/client-services`: `WorkerSession.bridgeService` → `rtcService`, `WorkerRuntimeService.connectWebrtcBridge` → `connectWebrtc`.

### Patch Changes

- a069511: Move the identity, contacts, devices and spaces service RPCs to buf messages, and correct
  `ClientServices` to declare the buf shapes those methods actually carry. The credential subsystem
  keeps its protobuf.js shapes — the payloads cross the RPC boundary as their shared wire bytes — so
  `@dxos/client`'s public API is unchanged.
- 066b35d: Move the devtools snapshot/feed/metadata responses and the invitation device profile to buf
  messages, and correct `ClientServices` to declare the buf shapes those methods carry. `@dxos/echo-client`
  no longer depends on `@dxos/codec-protobuf`. Gossip stays on protobuf.js: announcements cross the network
  between peers, and the two codecs frame an `Any` payload differently.
- 5df602e: Move the wire enums (`EdgeReplicationSetting`, `MembershipPolicy`, `SpaceState`, `ConnectionState`,
  `DeviceKind`, `DeviceType`) and the remaining `EchoMetadata` decode sites to buf. The enums
  `@dxos/client` re-exports (`SpaceState`, `DeviceKind`, `DeviceType`) are now the buf declarations:
  their members and values are unchanged, but TypeScript enums are nominal, so code comparing one of
  them against the same enum imported from `@dxos/protocols/proto/...` must import it from
  `@dxos/protocols/buf/...` instead.
- 7d04444: A worker whose OPFS cannot open a sync access handle now reports that once, at startup, instead of failing every database open for the life of the page. There is no in-memory fallback: it would show none of the stored data and keep nothing written to it. Creating a space no longer fails when its database takes longer than five seconds to initialize under load.
- Updated dependencies [a92ea18]
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [6388838]
- Updated dependencies [f82c78f]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [194b1d3]
- Updated dependencies [6ef35a6]
- Updated dependencies [ea11703]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [dcf911b]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [915db6a]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [472ca95]
- Updated dependencies [49271cd]
- Updated dependencies [0426925]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [c8b7158]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [66e9264]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ce194c0]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [ca34a80]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [1160094]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [2bb84d8]
- Updated dependencies [63e500b]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [a5dfa5e]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [690dcaa]
- Updated dependencies [e207c68]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [5a00dcb]
- Updated dependencies [17ed864]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9a3f01e]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [baa40a1]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [63629c5]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [693d1b4]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [1c8c1bd]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [c209b42]
- Updated dependencies [4da1052]
- Updated dependencies [eda8b55]
- Updated dependencies [e1be223]
- Updated dependencies [579da03]
- Updated dependencies [cc11297]
- Updated dependencies [461ce1e]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/worker-framework@0.12.0
  - @dxos/rpc@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/rpc-tunnel@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/credentials@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/rpc@0.11.1
- @dxos/rpc-tunnel@0.11.1
- @dxos/worker-framework@0.11.1

## 0.11.0

### Minor Changes

- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- 962c8cd: Delete the redundant `dxos.iframe.WorkerService` protobuf service (and its `StartRequest` message) now that the tab→worker control channel is defined and served via effect-rpc (`WorkerService` in `@dxos/protocols/rpc`, over the app `MessagePort`). Also removes the now-unused `iframeServiceBundle` and `workerServiceBundle` exports from `@dxos/client-protocol` (they had no consumers). The `dxos.mesh.bridge.BridgeService` and `dxos.iframe.AppService`/`ShellService` protobuf definitions are retained — they are still used by the WebRTC transport bridge and the shell↔app iframe transport respectively.
- f15c632: Remove the legacy protobuf byte-transport client providers `fromSocket` (websocket) and `fromAgent` (unix socket), along with `AgentClientServiceProvider`, `FromAgentOptions`, and `getUnixSocket`. `createClientServices` no longer supports a `runtime.client.remote_source` endpoint — it now throws, since the remaining deployment modes (`HOST`, `DEDICATED_WORKER`) and the shell↔app transport run over effect-rpc. This also removes `clientServiceBundle` from `@dxos/client-protocol`, which had no remaining consumers; the effect-rpc `rpc` surface and the Promise/`Stream` `services` surface are unchanged. A `remote_source` transport can be reintroduced over the effect-rpc `RpcPort` protocol if needed.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a83d98a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [6ad2084]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/worker-framework@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/rpc-tunnel@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
