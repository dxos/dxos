# @dxos/effect

## 0.12.0

### Minor Changes

- fd23a8b: Dissolve `ClientServicesHost` and drive the client-services runtime through Effect layers and an in-process event bus.

  - `@dxos/effect` gains an `Event` module (`Event.make`, `Event.on`, `Event.handler`, `Event.subscribe`, `Event.emit`, `Event.Bus`, `Event.makeBus`, `Event.busLayer`). `emit` awaits every handler, so an emit doubles as a barrier for the work it triggers.
  - `@dxos/client-services` replaces the hand-maintained open/close sequences with a lifecycle event chain (`StorageReady → IdentityLoaded → NetworkReady`, `IdentityBound`, `IdentityAvailable → DataSpacesReady`, `StackOpened`, plus `NetworkingEnabled`, `ProfileUpdated` and the `Closing → WipingStorage → Reset` chain). Each component opens on the event it depends on and closes in its layer finalizer, so open order comes from event causality and teardown from scope disposal. Platform inputs (edge clients, signal manager, transport factory) move into `ClientPlatformLayer`; logging, devtools and system services become stack layers with a push-based system status.
  - `ClientServicesHost` is gone: `ClientServicesLayer` composes the whole runtime, and `LocalClientServices`, the worker runtime and the test builder each compose the stack directly over a single runtime and their own SQLite layer.
  - `@dxos/worker-framework` owns session lifetime: the runtime scope lives until shutdown, a session scope is forked from it and closed when the tab releases its session lock, is superseded, or the worker shuts down. `WorkerSession` is inlined into the worker runtime as a scoped effect.
  - `WorkerService` is removed from `@dxos/protocols` and `@dxos/client-protocol`; tab↔worker session control is the framework's own protocol. `@dxos/client-protocol` adds `Rpc.serverLayer` / `layerClientServicesServer`, an effect-native RPC server over the ambient protocol. `@dxos/rpc` adds `RpcRouter`, which serves several rpc groups that come and go over one protocol, routing by longest tag prefix.
  - `@dxos/protocols` exports `normalizeHandlers`, which keys a class-backed implementation's rpc methods by tag and binds them. `RpcGroup.toLayer` otherwise reads own-enumerable properties and effect-rpc calls what it stored unbound, so serving a service tag directly hung every request whose handler touched `this` — including the status stream a tab waits for on boot. `@dxos/client-protocol` serves each service through `layerHandlersFromTag`, which applies it.
  - `@dxos/feed-store` closes the store from its layer finalizer rather than from the host.
  - Removes the `locks` packlet and the `@dxos/lock-file` dependency, and fixes an import cycle that left the bundled `@dxos/client-services` unable to build its RPC layer.

### Patch Changes

- 472ca95: Errors from `EffectEx.runPromise` and `EffectEx.causeToError` include span frames again and drop Effect runtime frames. `SchemaEx.mapAst` keeps encoding checks on the nodes it rebuilds, and ECHO's JSON Schema output keeps the checks on optional properties.
- 882ac2a: The ECHO indexer now reports why it ran.

  Each pass is a single `EchoHost._runIndexPass` span carrying the histogram of requests that triggered it (`documents-saved`, `feed-blocks`, `batch-continuation`, …) plus what the pass did (`updated`, `done`, `invalidates`), and the two `IndexEngine.update` calls nest under it instead of each starting its own root trace.

  The trigger and outcome ride on the span rather than a log line: the only level the OTLP log sink exports is INFO, which is also a level the browser console shows, and at three passes a second that would bury the console it is meant to help.

  Supporting changes:

  - `EffectEx.withContext(ctx)` runs an Effect under a DXOS `Context`: the context's W3C trace identity becomes the effect's parent span, and disposing the context interrupts the fiber. Apply it before `RuntimeProvider.runPromise`/`provide`.
  - `@trace.span({ attributes })` accepts a function of the decorated call's own arguments, and a new `resultAttributes` derives attributes from the return value, attached when it resolves. A fault in either extractor costs the span its attributes and never fails the traced method.
  - `RemoteSpan.setAttributes` lets a backend attach attributes after a span started; buffered spans replay them.

- Updated dependencies [e8088ea]
- Updated dependencies [4da1052]
  - @dxos/util@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/context@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/context@0.11.1
- @dxos/invariant@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [3f1fc67]
  - @dxos/util@0.11.0
  - @dxos/context@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
