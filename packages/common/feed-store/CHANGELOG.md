# @dxos/feed-store

## 0.12.0

### Patch Changes

- fd23a8b: Dissolve `ClientServicesHost` and drive the client-services runtime through Effect layers and an in-process event bus.

  - `@dxos/effect` gains an `Event` module (`Event.make`, `Event.on`, `Event.handler`, `Event.subscribe`, `Event.emit`, `Event.Bus`, `Event.makeBus`, `Event.busLayer`). `emit` awaits every handler, so an emit doubles as a barrier for the work it triggers.
  - `@dxos/client-services` replaces the hand-maintained open/close sequences with a lifecycle event chain (`StorageReady → IdentityLoaded → NetworkReady`, `IdentityBound`, `IdentityAvailable → DataSpacesReady`, `StackOpened`, plus `NetworkingEnabled`, `ProfileUpdated` and the `Closing → WipingStorage → Reset` chain). Each component opens on the event it depends on and closes in its layer finalizer, so open order comes from event causality and teardown from scope disposal. Platform inputs (edge clients, signal manager, transport factory) move into `ClientPlatformLayer`; logging, devtools and system services become stack layers with a push-based system status.
  - `ClientServicesHost` is gone: `ClientServicesLayer` composes the whole runtime, and `LocalClientServices`, the worker runtime and the test builder each compose the stack directly over a single runtime and their own SQLite layer.
  - `@dxos/worker-framework` owns session lifetime: the runtime scope lives until shutdown, a session scope is forked from it and closed when the tab releases its session lock, is superseded, or the worker shuts down. `WorkerSession` is inlined into the worker runtime as a scoped effect.
  - `WorkerService` is removed from `@dxos/protocols` and `@dxos/client-protocol`; tab↔worker session control is the framework's own protocol. `@dxos/client-protocol` adds `Rpc.serverLayer` / `layerClientServicesServer`, an effect-native RPC server over the ambient protocol. `@dxos/rpc` adds `RpcRouter`, which serves several rpc groups that come and go over one protocol, routing by longest tag prefix.
  - `@dxos/protocols` exports `normalizeHandlers`, which keys a class-backed implementation's rpc methods by tag and binds them. `RpcGroup.toLayer` otherwise reads own-enumerable properties and effect-rpc calls what it stored unbound, so serving a service tag directly hung every request whose handler touched `this` — including the status stream a tab waits for on boot. `@dxos/client-protocol` serves each service through `layerHandlersFromTag`, which applies it.
  - `@dxos/feed-store` closes the store from its layer finalizer rather than from the host.
  - Removes the `locks` packlet and the `@dxos/lock-file` dependency, and fixes an import cycle that left the bundled `@dxos/client-services` unable to build its RPC layer.

- Updated dependencies [4bac701]
- Updated dependencies [e8088ea]
- Updated dependencies [4da1052]
  - @dxos/hypercore@0.12.0
  - @dxos/util@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/keyring@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/random-access-storage@0.12.0
  - @dxos/crypto@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/vendor-hypercore@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/context@0.11.1
- @dxos/crypto@0.11.1
- @dxos/debug@0.11.1
- @dxos/hypercore@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keyring@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/random-access-storage@0.11.1
- @dxos/util@0.11.1
- @dxos/vendor-hypercore@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [6a03a30]
- Updated dependencies [f6a01e3]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/hypercore@0.11.0
  - @dxos/random-access-storage@0.11.0
  - @dxos/keyring@0.11.0
  - @dxos/context@0.11.0
  - @dxos/crypto@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
  - @dxos/vendor-hypercore@0.11.0
