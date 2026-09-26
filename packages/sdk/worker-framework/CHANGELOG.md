# @dxos/worker-framework

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

- 579da03: Worker connections recover from hostile callers and browsers instead of wedging or churning: a leader session that finishes opening after its lock was stolen (or the connection closed) is closed rather than left holding the storage lock; a stale handle is closed before the reconnect starts and a handle that opens after its attempt was abandoned is closed rather than installed; a throwing `onReconnect` callback no longer fails or loops the reconnection; failing connect handles retry with backoff and escalate through `onPersistentFailure`; a `provide-port` for an abandoned attempt is ignored; the worker reports `session-failed` so a tab holding ports nobody serves retries at once; a tab never steals its own leader lock or a leader it cannot hear because its coordinator link died (`WorkerCoordinator.onError`); `open()` rejects at the escalation threshold and tears down what it holds. `Worker.run` accepts a `signal` to terminate an in-process worker, and shuts down when its storage lock is stolen.

### Patch Changes

- a5dfa5e: Rewriting a persistent client's OPFS storage from outside the client — importing a profile archive, say — now has a way to wait until the storage is actually free.

  A page reload is not enough on its own: the OPFS pool's sync access handles belong to the dedicated worker, which the browser tears down asynchronously after the document goes away, so a write racing that teardown fails with `NoModificationAllowedError`.

  `Worker.displace(storageLockKey)` asks whichever worker holds a storage lock to shut down, over the same broadcast protocol `Worker.run` already uses to displace a predecessor. `withPersistentStorage(fn)` (from `@dxos/client/testing`) pairs that with the storage lock itself, running `fn` only once the worker has released it, and aborting after a timeout rather than waiting forever.

  `Worker.run` also no longer misses a displacement aimed at it during startup. It created the broadcast channel and then awaited the liveness-lock grant before attaching the channel's listener; a `BroadcastChannel` queues a delivery and never replays it, so a message landing in that window was dropped and the worker kept its storage lock. The listener now attaches in the same synchronous block as the channel, and a worker displaced before it finishes starting stands down instead of advertising a session it has already released its locks for.

- baa40a1: Report worker and client startup failures instead of hanging: leader sessions that close or time out release their worker, a worker runtime that fails to start rejects the connection, `ClientProvider` throws initialization errors to the error boundary, an RPC handler defect fails only its own request, and a failed space initialization settles `createSpace` and `waitUntilReady`.
- 1c8c1bd: Fix a client startup hang where a newly elected leader's worker waited out the full 15s budget on
  the storage lock. The stop signal that stands the previous worker down was broadcast from inside the
  storage-lock callback, so it was never sent while the new worker queued behind the incumbent it was
  meant to displace. It now goes out before the lock is requested. Also fixes a connection that could
  never close while its connect task was waiting for a port.
- e1be223: Worker displacement now has a second level for a worker that will not displace itself.

  Displacement is a `BroadcastChannel` signal, so it only works on a worker that is still servicing its event loop. One wedged in a busy CPU loop never runs `shutdown()`, so it releases neither its liveness lock nor the storage lock, and the next leader burns its whole 15s budget and fails with `Worker connection timed out: opening worker leader session`.

  A starting worker now arms a grace period (`Worker.Options.displaceGraceTimeout`, default 10s) when it broadcasts the stop signal. If the storage lock has still not been granted when it expires, it escalates on the same channel with a `terminate` action addressed at the _tab_ holding the incumbent's `Worker` handle, which terminates it and frees the lock. The worker's `ready` message carries the two fields this needs — `workerId` and `displaceChannel`.

  The kill is a fault, not routine displacement, so the tab that performs it reports a `WorkerTerminationError` at error level — carrying the storage lock, both worker ids and the grace period that elapsed — and closes the session with that same error.

  The escalation is broadcast, and a queued worker cannot know which worker holds the storage lock, so the decision of whether to act on one is taken locally by each tab: it terminates its worker only when the escalation came from another worker, its worker still holds its liveness lock (held over exactly the interval the storage lock is), and its worker fails to answer a `ping` within `LeaderTimeouts.workerProbeTimeout` (default 1s). Every healthy worker answers, so on a storage lock with three or more tabs only the wedged incumbent is terminated. Messages on the channel are validated against a schema before any of this, so a partial `terminate` cannot cost a worker its life.

  Termination needs a handle that can stop the worker: a caller-supplied `MessagePort` cannot, because `close()` leaves `Worker.run` holding both locks, so that case now reports a `WorkerNotTerminableError` instead of a kill that did not happen.

  This is complementary to worker-to-worker displacement, not a replacement: it needs the ex-leader tab to be alive and responsive, and when it is not, the cooperative path remains the only option. Escalation fires at most once per worker start and never after the lock is granted, and a tab ignores an escalation raised by the worker it owns, so it cannot become a kill loop.

- 461ce1e: Bound leader-lock stealing so one wedged tab can no longer restart every other tab's worker. A tab whose coordinator link has died never receives a heartbeat, so it judged the (healthy) leader stale and stole the lock on every port timeout — terminating the leader's worker every ~16s indefinitely, and in the worst case failing a boot outright. Steals are now capped per streak (reset on a successful port exchange), escalate once through `onPersistentFailure` when exhausted, and the stealer re-enters election instead of evicting the incumbent and handing the lock straight back. A leader that releases the lock cleanly also re-enters election rather than dropping out of the wait queue for good.
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [fd23a8b]
- Updated dependencies [782a442]
- Updated dependencies [472ca95]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [ce194c0]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [56276cd]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/async@0.12.0
  - @dxos/log@0.12.0
  - @dxos/context@0.12.0
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
