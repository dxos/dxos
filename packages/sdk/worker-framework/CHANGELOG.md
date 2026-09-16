# @dxos/worker-framework

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

- a5dfa5e: Rewriting a persistent client's OPFS storage from outside the client — importing a profile archive, say — now has a way to wait until the storage is actually free.

  A page reload is not enough on its own: the OPFS pool's sync access handles belong to the dedicated worker, which the browser tears down asynchronously after the document goes away, so a write racing that teardown fails with `NoModificationAllowedError`.

  `Worker.displace(storageLockKey)` asks whichever worker holds a storage lock to shut down, over the same broadcast protocol `Worker.run` already uses to displace a predecessor. `withPersistentStorage(fn)` (from `@dxos/client/testing`) pairs that with the storage lock itself, running `fn` only once the worker has released it, and aborting after a timeout rather than waiting forever.

  `Worker.run` also no longer misses a displacement aimed at it during startup. It created the broadcast channel and then awaited the liveness-lock grant before attaching the channel's listener; a `BroadcastChannel` queues a delivery and never replays it, so a message landing in that window was dropped and the worker kept its storage lock. The listener now attaches in the same synchronous block as the channel, and a worker displaced before it finishes starting stands down instead of advertising a session it has already released its locks for.

- 461ce1e: Bound leader-lock stealing so one wedged tab can no longer restart every other tab's worker. A tab whose coordinator link has died never receives a heartbeat, so it judged the (healthy) leader stale and stole the lock on every port timeout — terminating the leader's worker every ~16s indefinitely, and in the worst case failing a boot outright. Steals are now capped per streak (reset on a successful port exchange), escalate once through `onPersistentFailure` when exhausted, and the stealer re-enters election instead of evicting the incumbent and handing the lock straight back. A leader that releases the lock cleanly also re-enters election rather than dropping out of the wait queue for good.
- Updated dependencies [fd23a8b]
- Updated dependencies [472ca95]
- Updated dependencies [882ac2a]
- Updated dependencies [e8088ea]
  - @dxos/effect@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/context@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 6ad2084: Worker connections accept an `onPersistentFailure` escalation hook (with a `maxLeaderFailures` threshold, exposed as `onPersistentWorkerFailure` in `createClientServices`), invoked after consecutive leader-session failures so apps can surface or recover from a stuck worker connection instead of backing off silently forever.

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [f6a01e3]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/log@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0
