# @dxos/rpc

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

- 2df0297: Client service RPCs are registered with an `RpcRouter` at the bottom of the client-services layer stack instead of being enumerated per connection.

  `RpcRouter` is now a registry of rpc groups that any number of transports serve: `RpcRouter.layer` provides it with no transport, `RpcRouter.layerTransport` attaches the ambient `RpcServer.Protocol`, and a group registered before or after a transport is attached is served either way. A registration can carry an in-process client, and `RpcRouter.client` merges those into one tag-keyed surface with no wire hop.

  Each service registers itself: `RegisterService(rpc, tag)` (`@dxos/client-protocol`) is a layer requiring the service's handler tag and the router, kept separate from the layer that creates the handler. `ServiceStack` is now the whole stack — the components with the RPC services over them — so the per-connection lists are gone along with `layerClientServicesServer`, `layerHandlersFromTag` and `handlersFromStack`: a worker session builds `RpcRouter.layerTransport` over its protocol, and in-process consumers (`LocalClientServices`, diagnostics, tests) source their handlers from the router through `makeClientServicesRpcFromRouter`. `SystemService` depends on the router rather than on every other service tag.

  Also in this change:

  - One open/close state machine backs every transport server in `@dxos/client-protocol`'s `Rpc`, so concurrent opens cannot build two runtimes and a close during startup disposes the runtime that startup created.
  - `normalizeHandlers` resolves each method per call, so an implementation replaced after registration serves subsequent requests.
  - `ServiceContext.services` (test builder) is replaced by the scoped `ServiceContext.rpc`, and `TestBuilder.createClientServer` returns an `Rpc.GroupServer` served off the host's router.

### Patch Changes

- 4aa6a33: MCP servers speak protocol revision 2026-07-28, which carries the client's identity and requested
  revision in each request rather than in a session opened by `initialize`. Effect moves to
  4.0.0-rc.117 for it. 2025-06-18 is still served, and everything it needs sits in `legacy-*` modules
  or under a marker naming the surface that must drop it, so removing that support later is deletion.

  `McpServer.normalizeResponse` takes the request, so a reply Effect framed as an event stream
  collapses back to its single JSON message, and a notification-only reply answers 202.
  `$mcp_initialize` is recorded once per successful handshake on either revision, and every MCP event
  carries a client name. `@dxos/log` gains a `noop` processor, which a server whose stdout carries a
  protocol selects so it logs only through the processors observability installs.

- Updated dependencies [6388838]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [194b1d3]
- Updated dependencies [23d2d8c]
- Updated dependencies [782a442]
- Updated dependencies [e56276b]
- Updated dependencies [967b130]
- Updated dependencies [3ea0b0f]
- Updated dependencies [ce194c0]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [78e5596]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9e91762]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [f8bfba0]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [85e6347]
- Updated dependencies [4da1052]
  - @dxos/protocols@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/context@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/log@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/context@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
