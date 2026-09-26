# @dxos/client

## 0.12.0

### Minor Changes

- 3b78bb6: Move the WebRTC transport bridge to buf types

  `BridgeService`'s RPC payloads are buf messages. The transport itself (`RtcTransportService`,
  `RtcTransportProxyFactory`) keeps the protobuf.js shapes, and `bridge-codec.ts` converts at the RPC
  boundary, so consumers of the transport interface are unaffected. Both codecs produce identical
  wire bytes.

- fd23a8b: Dissolve `ClientServicesHost` and drive the client-services runtime through Effect layers and an in-process hook controller.

  - `@dxos/effect` gains a `Hook` module (`Hook.make`, `Hook.on`, `Hook.handler`, `Hook.subscribe`, `Hook.emit`, `Hook.Controller`, `Hook.makeController`, `Hook.controllerLayer`). `emit` awaits every handler, so an emit doubles as a barrier for the work it triggers.
  - `@dxos/client-services` replaces the hand-maintained open/close sequences with a lifecycle event chain (`StorageReady → IdentityLoaded → NetworkReady`, `IdentityBound`, `IdentityAvailable → DataSpacesReady`, `StackOpened`, plus `NetworkingEnabled`, `ProfileUpdated` and the `Closing → WipingStorage → Reset` chain). Each component opens on the event it depends on and closes in its layer finalizer, so open order comes from event causality and teardown from scope disposal. Platform inputs (edge clients, signal manager, transport factory) move into `ClientPlatformLayer`; logging, devtools and system services become stack layers with a push-based system status.
  - `ClientServicesHost` is gone: `ClientServicesLayer` composes the whole runtime, and `LocalClientServices`, the worker runtime and the test builder each compose the stack directly over a single runtime and their own SQLite layer.
  - `@dxos/worker-framework` owns session lifetime: the runtime scope lives until shutdown, a session scope is forked from it and closed when the tab releases its session lock, is superseded, or the worker shuts down. `WorkerSession` is inlined into the worker runtime as a scoped effect.
  - `WorkerService` is removed from `@dxos/protocols` and `@dxos/client-protocol`; tab↔worker session control is the framework's own protocol. `@dxos/client-protocol` adds `Rpc.serverLayer` / `layerClientServicesServer`, an effect-native RPC server over the ambient protocol. `@dxos/rpc` adds `RpcRouter`, which serves several rpc groups that come and go over one protocol, routing by longest tag prefix.
  - `@dxos/protocols` exports `normalizeHandlers`, which keys a class-backed implementation's rpc methods by tag and binds them. `RpcGroup.toLayer` otherwise reads own-enumerable properties and effect-rpc calls what it stored unbound, so serving a service tag directly hung every request whose handler touched `this` — including the status stream a tab waits for on boot. `@dxos/client-protocol` serves each service through `layerHandlersFromTag`, which applies it.
  - `@dxos/feed-store` closes the store from its layer finalizer rather than from the host.
  - Removes the `locks` packlet and the `@dxos/lock-file` dependency, and fixes an import cycle that left the bundled `@dxos/client-services` unable to build its RPC layer.

- 881f900: The agent debug port can now survive a reload of the tab it was authorized in. `start({ persist: true })` records the session in `sessionStorage`, and `resume()` restarts the loop under the same id, so an agent's session id keeps working across a navigation the user did not intend to end it — an OAuth redirect above all, which previously stranded the investigation exactly when the interesting state appeared.

  Deliberately narrow: `sessionStorage`, not `localStorage`, so an arbitrary-eval port cannot outlive its tab; a 30-minute expiry so a forgotten port lapses on its own; `resume()` never mints a session, so mounting the devtools hook cannot switch the port on; and stopping clears the record.

- 75d9c7c: Add `client.halo.deleteIdentity()`, which closes and deletes every space and the identity, then wipes the storage they left behind (automerge documents, hypercore files, the feed store, the index tables and the keyring). The client stays open, so `createIdentity()` can be called straight afterwards.
- a74e9b0: **Breaking:** `Invitation` and `QueryInvitationsResponse` are now the buf-generated types. `InvitationsService` carries them over `bufMessage`, which matches the previous wire format byte-for-byte apart from proto3 default values that protobuf.js wrote explicitly, so invitation codes stay interchangeable across the change.

  Consumers of `@dxos/client/invitations` and `@dxos/react-client/invitations`:

  - Nested enums are flattened: `Invitation.State.SUCCESS` becomes `Invitation_State.SUCCESS`, and likewise for `Type`, `Kind` and `AuthMethod`. The enum values are unchanged.
  - `Invitation` is now a type; construct one with `create(InvitationSchema, { ... })` from `@bufbuild/protobuf`.
  - Key fields (`spaceKey`, `swarmKey`, `identityKey`, `delegationCredentialId`) are `dxos.keys.PublicKey` messages rather than the `PublicKey` class. Read one with `PublicKey.from(key.data)`; the `useInvitationStatus` hook still reports the class.
  - `created` is a `google.protobuf.Timestamp` rather than a `Date`.

- 608a172: The client services stack is built from `LayerSpec`s aggregated by a `LayerStack`, instead of a hand-written chain of `provideMerge` calls.

  Each part of the stack is its own top-level spec declaring the tags it requires and the tags it provides, so build order — and which specs are built at all — follows from the graph. `clientServiceSpecs` is the list of them with the option-driven choices applied, and `makeClientServicesStack` is what every embedder builds: the worker runtime, `LocalClientServices` and the test `ServiceContext`. They reach services through `resolve(tag)` rather than a context of everything.

  `LayerSpec` takes an `eager` flag, and `LayerStack` builds those specs when a slice initializes rather than waiting for one of their tags to be requested. Specs are resolved lazily by tag, so a spec whose point is a side effect — registering an rpc service, subscribing to lifecycle events, attaching a replicator — provides nothing anyone asks for and would never run. `eager: true` builds it (with whatever provides its requirements) as soon as the slice's own requirements are in place, once per slice. `LayerStack.init` builds those specs without asking for a tag, which is how an embedder starts a stack whose point is its side effects.

  `LayerStack.layer` declares the ambient services as tags rather than taking an opaque `Context`, so the returned layer requires exactly those tags and a missing one is a compile error instead of a silently pruned spec. `LayerStack` still accepts ambient `services` directly: a context available to every slice as if a lower-affinity one provided it, which is the only way into the lowest slice.

  `LayerStack` also disposes a slice's batch runtimes newest first rather than concurrently: a batch materialized later may hold services from an earlier one, and Effect orders finalizers only within a single runtime.

- df22dec: Move the network carrier group to buf types

  `NetworkService` and `EdgeAgentService` now speak buf messages, so the types they carry change
  shape for consumers:

  - `MeshProxy.networkStatus` reports the buf `NetworkStatus`. Its `swarm` field uses the buf
    `ConnectionState` enum, imported from `@dxos/protocols/buf/dxos/client/services_pb` rather than
    `@dxos/protocols/proto/dxos/client/services`.
  - Nested enums flatten: `EdgeStatus.ConnectionState.X` becomes `EdgeStatus_ConnectionState.X`, and
    `QueryAgentStatusResponse.AgentStatus.X` becomes `QueryAgentStatusResponse_AgentStatus.X`.
  - Building one of these messages by object literal no longer typechecks; construct it with
    `create(NetworkStatusSchema, { … })` from `@bufbuild/protobuf`.

  Both codecs produce identical wire bytes, so no persisted or in-flight data changes.

- 139a3b0: Move `SystemService.getPlatform` to buf types

  `Platform` — reachable through `client.diagnostics()` — is now the buf message. Its nested enum
  flattens: `Platform.PLATFORM_TYPE.X` becomes `Platform_PLATFORM_TYPE.X`, imported from
  `@dxos/protocols/buf/dxos/client/services_pb`. Both codecs produce identical wire bytes.

  This retires the last `protoMessage` payload in `SystemService`.

- 3e08678: Rename the WebRTC bridge to `RTCService` and transfer the `RTCDataChannel` to the worker instead of relaying every packet through RPC.

  `RTCDataChannel` is a transferable object on every platform we support, so the tab now hands the established channel straight to the worker and the worker reads and writes it directly. Only signalling crosses the rpc boundary. `RTCService.open` takes the caller's end of a dedicated `MessageChannel` as part of its payload (transferred via effect's worker protocol) and posts the channel to it; the response stream is now purely a stream of signalling messages. The channel cannot ride that stream — a browser only allows an `RTCDataChannel` to be transferred in the task it was created in, and a stream chunk is encoded and sent a task later.

  Removed with it: the `sendData` rpc and its `DataRequest` message, the `BridgeEvent` data/connection-state events, and the duplex relay and manual backpressure callbacks that existed on both sides to carry them. The channel's own send buffer is now the only flow-control signal, applied by a single shared `bindDataChannel` helper used by the direct and proxied transports alike.

  A transferred channel does not deliver its events in the order the creating context would have seen, so that helper attaches the two directions separately: it starts reading on whichever of the first message or the `open` event arrives first, since dropping that first frame stalls the wire protocol's handshake for good, and it starts writing only once the channel is really open, since `send` throws while it is still connecting. A `*.browser.test.ts` suite covers the handover end to end against real Chromium WebRTC and a real worker, and unit tests pin each of those orderings.

  Breaking for embedders that wire the worker themselves:

  - `@dxos/protocols/rpc`: `BridgeService` → `RTCService`; its proto payloads moved from `dxos.mesh.bridge` to `dxos.mesh.rtc` and the `dxos.mesh.bridge.BridgeService` protobuf service is gone (the surface is effect-rpc only).
  - `@dxos/network-manager`: `RtcTransportService` → `RtcService`, now implementing the effect-rpc handlers directly; `RtcTransportProxyFactory.setBridgeService` → `setRtcService`, which takes an `RTCService.Client` rather than a proto-shaped service. `TransportKind.WEB_RTC_PROXY` is gone — the proxy transport needs a real browser now, so it is covered by the browser suite rather than the node `TestBuilder`.
  - `@dxos/client-protocol`: `serveBridgeService`/`makeBridgeServiceClient`/`makeBridgeServiceClientOverProtocol` → `serveRtcService`/`makeRtcServiceClient`/`makeRtcServiceClientOverProtocol`, the latter two now scoped effects rather than promises.
  - `@dxos/client-services`: `WorkerSession.bridgeService` → `rtcService`, `WorkerRuntimeService.connectWebrtcBridge` → `connectWebrtc`.

- dd039d2: Adding a known contact to a space now sends them a signed invitation notice through `client.halo.inbox` (`notices`, `send`, `ack`), which Composer shows as a Join toast, a Space invitations article and a badge on the account avatar; the contact picker is single-select beside a role select, `Form.FieldSet` gains `appearance='section'` for titled blocks inside a settings panel, and `Combobox` popovers no longer shrink below their minimum width.
- 0280a6a: Cut app startup cost by loading feature code on demand rather than at boot.

  Activation: the coarse `DeferredStartup` event is replaced by per-plugin start events (`<pluginKey>.event.start`, built with `ActivationEvent.pluginStart`). A plugin's own start event now fires when one of its modules contributes a `ReactSurface` — the feature being rendered is the demand signal — so an unvisited feature's contributions never load. Contributions no surface can gate ride the feature they belong to instead: app-graph builders default to the graph plugin's start event, skill definitions to the assistant's, and cross-plugin contributions (markdown extensions, connectors, game variants) to the consuming plugin's. React surfaces activate on their declared roles.

  Client: initialization can run forked off app startup. `Client.waitUntilInitialized()` exposes a stable completion signal, `useClient` suspends until it resolves, `ClientProvider` gains a `suspend` mode that provides context immediately instead of rendering the fallback subtree-wide, and the HALO adapters are construction-safe over an uninitialized client.

  Bundle: `runDedicatedWorker` moves to `@dxos/client/worker` so the worker-side service runtime (client-services, sqlite, hypercore) is no longer statically reachable from main-thread bundles; the in-process host (`fromHost`) and the RTC ice provider load on demand. A new engine-free `@dxos/compute-hyperformula/types` subpath lets schema and operation definitions use cell-address helpers without loading HyperFormula.

  Breaking: `ActivationEvents.DeferredStartup` and `ActivationEvents.SkillsRequested` are removed; worker entrypoints importing `runDedicatedWorker` from the root must import it from `@dxos/client/worker`; and a plugin's React surface must declare the roles it serves to be activated.

### Patch Changes

- 86d1482: Let a dev server start the agent debug port on a known session, and let plugins contribute
  slash-menu commands to the markdown editor.

  `DebugPortStartOptions` gains `session`, so a caller that already knows the id skips the
  copy-the-id handshake. `MarkdownCapabilities.MenuExtension` is a new multi capability: an entry
  names an Operation (not a callback), and contributions are grouped by the contributing plugin.

  Also renames the settings-panel operation's key to `org.dxos.operation.appToolkit.openSettings`.
  It collided with `LayoutOperation.Open`, so neither could be resolved by key alone.

- a069511: Move the identity, contacts, devices and spaces service RPCs to buf messages, and correct
  `ClientServices` to declare the buf shapes those methods actually carry. The credential subsystem
  keeps its protobuf.js shapes — the payloads cross the RPC boundary as their shared wire bytes — so
  `@dxos/client`'s public API is unchanged.
- 5df602e: Move the wire enums (`EdgeReplicationSetting`, `MembershipPolicy`, `SpaceState`, `ConnectionState`,
  `DeviceKind`, `DeviceType`) and the remaining `EchoMetadata` decode sites to buf. The enums
  `@dxos/client` re-exports (`SpaceState`, `DeviceKind`, `DeviceType`) are now the buf declarations:
  their members and values are unchanged, but TypeScript enums are nominal, so code comparing one of
  them against the same enum imported from `@dxos/protocols/proto/...` must import it from
  `@dxos/protocols/buf/...` instead.
- 7d04444: A worker whose OPFS cannot open a sync access handle now reports that once, at startup, instead of failing every database open for the life of the page. There is no in-memory fallback: it would show none of the stored data and keep nothing written to it. Creating a space no longer fails when its database takes longer than five seconds to initialize under load.
- 5959b41: The project pipeline chart no longer burns CPU while it is closed.

  `ProjectArticle` mounted `ProjectPipeline` unconditionally inside the splitter's end panel and let `showPipeline` collapse it visually, so the chart kept rebuilding its whole timeline from the space's trace feed with nothing on screen. It is now mounted only while shown.

  `useSessionTimeline` additionally debounces the trace feed by 500ms, matching the debounce already applied to the process tree. `buildSessionTimeline` is not incremental — it re-flattens the full message history on every emission — and the feed emits per message, far faster than a reader can read. `useTraceMessages` takes the interval as a new optional `debounce` option; callers that omit it (such as `TracePanel`) are unchanged.

  `RtcTransportProxy` also no longer logs whole bridge events. A data event carries the packet as a `Uint8Array`, which the logger serialises as one JSON key per byte — 20MB across a few minutes of an idle session. It now logs the event's case and the payload's byte length.

  `SpaceProxy` no longer re-applies an unchanged automerge root. The host re-sends the space several times a second as its feeds advance, and the root is the same in nearly all of those updates; the redundant ones were walked down into the database only to be discarded there.

- a5dfa5e: Rewriting a persistent client's OPFS storage from outside the client — importing a profile archive, say — now has a way to wait until the storage is actually free.

  A page reload is not enough on its own: the OPFS pool's sync access handles belong to the dedicated worker, which the browser tears down asynchronously after the document goes away, so a write racing that teardown fails with `NoModificationAllowedError`.

  `Worker.displace(storageLockKey)` asks whichever worker holds a storage lock to shut down, over the same broadcast protocol `Worker.run` already uses to displace a predecessor. `withPersistentStorage(fn)` (from `@dxos/client/testing`) pairs that with the storage lock itself, running `fn` only once the worker has released it, and aborting after a timeout rather than waiting forever.

  `Worker.run` also no longer misses a displacement aimed at it during startup. It created the broadcast channel and then awaited the liveness-lock grant before attaching the channel's listener; a `BroadcastChannel` queues a delivery and never replays it, so a message landing in that window was dropped and the worker kept its storage lock. The listener now attaches in the same synchronous block as the channel, and a worker displaced before it finishes starting stands down instead of advertising a session it has already released its locks for.

- c4188a6: Fix every identity recovery path — passkey, recovery code, email token and OAuth proof — failing in
  the client before a request reached EDGE.

  `HaloProxy.recoverIdentity` forwarded the caller's `RecoverIdentityArgs` union straight to the rpc,
  where the payload codec encodes `RecoverIdentityRequest` and throws on a message whose `request`
  oneof was never selected. The proxy maps the union onto that oneof again, as it did before the buf
  migration; the public API is unchanged.

- 9996125: `Client.reset()` completes when the host shuts down before answering, as a dedicated worker does, so the caller's post-reset step (such as opening the join-identity flow) runs.
- 2df0297: Client service RPCs are registered with an `RpcRouter` at the bottom of the client-services layer stack instead of being enumerated per connection.

  `RpcRouter` is now a registry of rpc groups that any number of transports serve: `RpcRouter.layer` provides it with no transport, `RpcRouter.layerTransport` attaches the ambient `RpcServer.Protocol`, and a group registered before or after a transport is attached is served either way. A registration can carry an in-process client, and `RpcRouter.client` merges those into one tag-keyed surface with no wire hop.

  Each service registers itself: `RegisterService(rpc, tag)` (`@dxos/client-protocol`) is a layer requiring the service's handler tag and the router, kept separate from the layer that creates the handler. `ServiceStack` is now the whole stack — the components with the RPC services over them — so the per-connection lists are gone along with `layerClientServicesServer`, `layerHandlersFromTag` and `handlersFromStack`: a worker session builds `RpcRouter.layerTransport` over its protocol, and in-process consumers (`LocalClientServices`, diagnostics, tests) source their handlers from the router through `makeClientServicesRpcFromRouter`. `SystemService` depends on the router rather than on every other service tag.

  Also in this change:

  - One open/close state machine backs every transport server in `@dxos/client-protocol`'s `Rpc`, so concurrent opens cannot build two runtimes and a close during startup disposes the runtime that startup created.
  - `normalizeHandlers` resolves each method per call, so an implementation replaced after registration serves subsequent requests.
  - `ServiceContext.services` (test builder) is replaced by the scoped `ServiceContext.rpc`, and `TestBuilder.createClientServer` returns an `Rpc.GroupServer` served off the host's router.

- adcad97: `Space.listen` returns a handle whose `ready` promise resolves once the listener is registered, so a message posted after awaiting it is not dropped. A service stream subscriber whose `onData` throws now raises an unhandled error and keeps receiving, instead of silently ending its subscription.
- Updated dependencies [a92ea18]
- Updated dependencies [9477170]
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [a1a22ee]
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
- Updated dependencies [5df602e]
- Updated dependencies [63fc847]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [069e8ed]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [760cc03]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [7d04444]
- Updated dependencies [194b1d3]
- Updated dependencies [6ef35a6]
- Updated dependencies [ea11703]
- Updated dependencies [c01fef6]
- Updated dependencies [bab13fe]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [dcf911b]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [7575cb6]
- Updated dependencies [d0beedc]
- Updated dependencies [2c5aaf0]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [9817b6f]
- Updated dependencies [f38f3ae]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [ed9aeba]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [99dcc7c]
- Updated dependencies [b3673ee]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [915db6a]
- Updated dependencies [020af54]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
- Updated dependencies [261c821]
- Updated dependencies [ed43a8d]
- Updated dependencies [dde6714]
- Updated dependencies [9d4dec3]
- Updated dependencies [a3b6ef0]
- Updated dependencies [782a442]
- Updated dependencies [a6559a2]
- Updated dependencies [b02fe16]
- Updated dependencies [4c52ca6]
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
- Updated dependencies [84622b1]
- Updated dependencies [e5c13e4]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [5cf307d]
- Updated dependencies [6139557]
- Updated dependencies [5ceaf9c]
- Updated dependencies [48ea128]
- Updated dependencies [f654860]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [c993432]
- Updated dependencies [0132aab]
- Updated dependencies [3ea0b0f]
- Updated dependencies [47c8d7e]
- Updated dependencies [ca4429a]
- Updated dependencies [10b1239]
- Updated dependencies [505cc1e]
- Updated dependencies [490127e]
- Updated dependencies [851791f]
- Updated dependencies [608a172]
- Updated dependencies [d535d55]
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
- Updated dependencies [02fe893]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [5959b41]
- Updated dependencies [2a41efd]
- Updated dependencies [a09e18e]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [8610d9d]
- Updated dependencies [fc8c80c]
- Updated dependencies [a5dfa5e]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [690dcaa]
- Updated dependencies [14c2fab]
- Updated dependencies [e207c68]
- Updated dependencies [89f2811]
- Updated dependencies [df93cc2]
- Updated dependencies [092f3be]
- Updated dependencies [5b504b4]
- Updated dependencies [a53cabb]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [16e0588]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [5a00dcb]
- Updated dependencies [17ed864]
- Updated dependencies [f81a4f0]
- Updated dependencies [6668dba]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [18a59c8]
- Updated dependencies [b7001c2]
- Updated dependencies [9e91762]
- Updated dependencies [4f55909]
- Updated dependencies [f4c2702]
- Updated dependencies [2df0297]
- Updated dependencies [a858612]
- Updated dependencies [2374d17]
- Updated dependencies [3e08678]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9a3f01e]
- Updated dependencies [8f372ce]
- Updated dependencies [631ade3]
- Updated dependencies [cd9bf16]
- Updated dependencies [ba2cebf]
- Updated dependencies [2b6eb8d]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [74acdc6]
- Updated dependencies [a24c7fb]
- Updated dependencies [09fedd7]
- Updated dependencies [56276cd]
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
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [1c8c1bd]
- Updated dependencies [40b50c2]
- Updated dependencies [e64e2b5]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [c209b42]
- Updated dependencies [4da1052]
- Updated dependencies [eda8b55]
- Updated dependencies [ceff869]
- Updated dependencies [e1be223]
- Updated dependencies [579da03]
- Updated dependencies [cc11297]
- Updated dependencies [461ce1e]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/compute-runtime@0.12.0
  - @dxos/client-services@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/config@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/echo-client@0.12.0
  - @dxos/worker-framework@0.12.0
  - @dxos/rpc@0.12.0
  - @dxos/network-manager@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/websocket-rpc@0.12.0
  - @dxos/credentials@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/context@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/messaging@0.12.0
  - @dxos/rpc-tunnel@0.12.0
  - @dxos/timeframe@0.12.0
  - @dxos/blob@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/client-services@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/config@0.11.1
- @dxos/context@0.11.1
- @dxos/credentials@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-host@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/kv-store@0.11.1
- @dxos/log@0.11.1
- @dxos/messaging@0.11.1
- @dxos/network-manager@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/random-access-storage@0.11.1
- @dxos/rpc@0.11.1
- @dxos/rpc-tunnel@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/timeframe@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1
- @dxos/websocket-rpc@0.11.1
- @dxos/worker-framework@0.11.1

## 0.11.0

### Minor Changes

- 856c4f0: Remove the legacy SharedWorker client-services path. The `@dxos/client/worker` and `@dxos/react-client/worker` subpath exports, the `createWorker` client option, and `ServicesMode.SHARED_WORKER` support are gone; use the dedicated-worker mode (`createDedicatedWorker`) instead. The `SHARED_WORKER` proto enum values are retained but deprecated for wire compatibility.
- f15c632: Remove the legacy protobuf byte-transport client providers `fromSocket` (websocket) and `fromAgent` (unix socket), along with `AgentClientServiceProvider`, `FromAgentOptions`, and `getUnixSocket`. `createClientServices` no longer supports a `runtime.client.remote_source` endpoint — it now throws, since the remaining deployment modes (`HOST`, `DEDICATED_WORKER`) and the shell↔app transport run over effect-rpc. This also removes `clientServiceBundle` from `@dxos/client-protocol`, which had no remaining consumers; the effect-rpc `rpc` surface and the Promise/`Stream` `services` surface are unchanged. A `remote_source` transport can be reintroduced over the effect-rpc `RpcPort` protocol if needed.

### Patch Changes

- eec72c5: Fix comment author attribution and reset-device reload. `useIdentity` now seeds its atom with the service's synchronous snapshot so the current identity is available on the first render instead of a transient `undefined` — a comment sent in that window was stamped with an empty sender and never matched its author, hiding the edit affordance. During `client.reset()` the worker-reconnect handler now reloads to the origin (fresh boot) rather than the stale current route, and `Client.resetting` exposes that state. SQLite hypercore storage drains in-flight writes on `close()` so a save racing reset teardown can't stall or reject against a torn-down connection.
- 6df314a: Remove the deprecated `descriptors` member from `ClientServicesProvider` (and the corresponding `ServiceRegistry` descriptor slot). The protobuf service descriptors it exposed had no consumers; the effect-rpc surface (`rpc`) and the Promise/`Stream` `services` surface are unaffected. `clientServiceBundle` remains for the legacy byte-transport bridges that still use it.
- 410a019: Restore the iframe shell (`shell='./shell.html'`) client-services connection after the effect-rpc migration. The app now re-serves its services to the shell over effect-rpc (matching the shell's `ClientServicesProxy` consumer) instead of the removed protobuf peer, and the shell provides its parent origin upfront so the effect-rpc client can initiate the connection without deadlocking. Fixes apps that embed the external shell iframe hanging on startup.
- d547045: Use the WebRTC transport for bun as well as node: bump node-datachannel to 0.32.3 (the 0.30.0 darwin-arm64 binary crashed under both runtimes) and remove the obsolete bun memory-transport guard. CLI `halo share` prints the joinable URL and validates `--host` as an absolute URL.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a83d98a]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [ae18615]
- Updated dependencies [14983db]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [b3a3fcf]
- Updated dependencies [4bb7e3b]
- Updated dependencies [da66270]
- Updated dependencies [41141d8]
- Updated dependencies [da66270]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [6ad2084]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/client-services@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/echo-host@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/messaging@0.11.0
  - @dxos/config@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/worker-framework@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/random-access-storage@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/network-manager@0.11.0
  - @dxos/rpc@0.11.0
  - @dxos/websocket-rpc@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/timeframe@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/rpc-tunnel@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
