# client-services-dissolve-host — Design

Branch `dm/client-services-refactor`, PR [#13094](https://github.com/dxos/dxos/pull/13094).
Composer preview: https://pr-13094-composer-dev.dxos.workers.dev.

## Goal

Dissolve `ClientServicesHost` into as little as possible, keeping composable Effect layers and
services. Lifecycle is expressed as layer-owned handlers on the `@dxos/effect` `Event` bus, teardown
is scope/runtime disposal, and every embedder (in-process client, dedicated worker, test context)
composes the same `ClientServicesLayer` itself. The same treatment then extends outward to the
worker runtime, worker session, and worker framework so that every lifetime is a scope.

## Decisions

### Lifecycle and events

- **D1 — Order comes from event causality, never subscription order.** Boot is a chain of facts:
  `Opening → StorageReady → IdentityLoaded → NetworkReady`, `IdentityBound`,
  `IdentityAvailable → DataSpacesReady`, `StackOpened`, `NetworkingEnabled`, `ProfileUpdated`
  (`packlets/services/events.ts`). Each layer subscribes to the fact it needs and emits the fact
  it establishes. Sibling layers under `mergeAll` build concurrently, so subscription order is never
  load-bearing. Handlers on one event run in parallel; `emit` completes once all handlers have, so an
  emit doubles as a barrier for the work it triggers.
- **D2 — Payloads carry facts only.** No DXOS `Context` in payloads. A layer that needs one takes it
  from its scope (`EffectEx.contextFromScope()`); embedders emit under their open context with
  `EffectEx.withContext(ctx)` so handler spans nest under it.
- **D3 — Teardown has no events.** Each layer closes its component in its scope finalizer
  (`Effect.addFinalizer(close)` unconditionally; `Resource.close()` before open is a no-op), so
  runtime disposal unwinds the stack in reverse build order. The layer chain order in
  `ServiceStack` is therefore load-bearing for teardown.
- **D4 — Handler errors are defects.** An event cannot enumerate the errors of every subscriber.
  Unsubscribe is a plain Set delete on scope close; no custom callbacks.
- **D5 — `Event.on(X, Effect.fn('name')(function* (payload) {...}))`** is the handler syntax
  everywhere.
- **D6 — Reset is an event chain on the embedder's bus.** `Closing → WipingStorage → Reset`,
  emitted by `SystemServiceImpl.reset`. The embedder owns the bus (it outlives the stack) and
  handles all three: close the stack, wipe storage over a fresh SQLite layer, then reload/shutdown.
  The stack's subscriptions on the same bus are removed when its scope closes.
- **D7 — Replicators register themselves.** `registerReplicator(tag)` subscribes to `NetworkReady`
  and attaches whatever replicator is bound beneath it; the stack no longer enumerates them.

### Composition

- **D8 — `ClientServicesLayer` is the whole runtime.** RPC handler layers over `ServiceStack` over
  `ClientPlatformLayer`, config and bus, requiring the SQL services (`SqlClient | SqlExport |
SqlTransaction`) from beneath. Embedders stack their SQLite layer under it and own exactly one
  runtime/scope. `handlersFromStack(stack)` derives `Partial<ClientServicesHandlers>` from the
  built context; `enableNetworking` is the emit for embedders with `autoConnect: false`.
- **D9 — Config and bus are inputs, for now.** They are passed as options and re-provided as
  layers. The user's TODO in `client-services-stack.ts` says both should become layer
  requirements instead of parameters (see Outstanding).
- **D10 — `SystemService` is a stack layer** (`SystemServiceLayer`), served over the domain
  handlers from the stack's tags; ACTIVE on `StackOpened`, INACTIVE in its finalizer. Embedders no
  longer construct it. `rpcHandlersFromStack` (domain services only) feeds its diagnostics;
  `handlersFromStack` adds `SystemService`.
- **D11 — Diagnostics collection over handlers is one helper**
  (`createDiagnosticsFromHandlers`), bridging in-process for the duration of a call. The
  BroadcastChannel diagnostics mechanism was dead (its browser handler never matched the
  effect-rpc handler shape) and was deleted along with the `#diagnostics-broadcast` import map.
- **D12 — No `ManagedRuntime` where an Effect surrounds the code.** Prefer `Layer.build` in a
  scope, `Effect.provide(layer)` for one-shot work (storage wipe), and `Scope.fork` for
  sub-lifetimes (the stack under the worker runtime, so a reset can close it early).
- **D13 — Layers are values, not factories,** unless they close over per-instance parameters.

### Worker runtime and framework

- **D14 — A scope is a lifetime, closed by its owner.** `Worker.run` used `Effect.scoped` around
  `createRuntime`, closing the scope right after init, so nothing could use it for teardown. The
  framework now creates the runtime scope itself and closes it on shutdown; `RuntimeHandle.stop`
  and the runtime's `start`/`stop` are gone. `makeWorkerRuntime` is
  `Effect<WorkerRuntimeService, never, Scope>` that builds and opens the stack; teardown is its
  finalizers. Runtime-initiated shutdown (last session closed, reset finished) calls a
  `requestShutdown` option instead of stopping itself.
- **D15 — Session scopes are children of the runtime scope** (`Scope.fork`), so shutdown closes
  sessions first, then the runtime. `RuntimeHandle.createSession` acquires its resources into the
  scope and returns; it must not block for the session's lifetime. The framework closes the scope
  when the tab's session lock releases, when a newer connect attempt supersedes it, or on shutdown.
- **D16 — Tab liveness belongs to the framework, not a client service.** The tab holds a Web Lock
  per connect attempt (`${clientId}/session/${attempt}`) and sends its key as `sessionLockKey` on
  `request-port`; the leader forwards it on `start-session`; the worker races the session against
  that lock. This replaces `WorkerService.start`'s `lockKey`. `WorkerService.stop` was never
  called; `origin` is read from the worker's own `location`. `WorkerService` is deleted from
  protocols, the merged `ClientServicesRpcs`, `ClientServicesHandlers`, and the tab client.
- **D17 — Sessions serve RPC with an effect-native server.** `Rpc.serverLayer` /
  `layerClientServicesServer` (client-protocol) serve the merged group from handler layers built
  with `Rpcs.toLayer(Tag)` over the stack context, with timing on to match the tab client. No
  `ClientRpcServer`, no `ClientServicesHandlers` in the worker. The readiness gate is a single wait
  before the server is built (a startup failure now fails the session rather than each request).
- **D18 — The worker→tab client transport cannot be torn down before the tab acknowledges it.**
  Effect's worker pool `run` awaits the runner's ready message uninterruptibly. Real tabs serve the
  bridge port, so this only bites tests; the framework tests stand in for the tab's runner by
  posting the ready frame on the port. Worth a look upstream or a bounded teardown.

### Process

- Commit each coherent change once it typechecks and lints; push often; suites are run at
  milestones, not per commit (user: "focus on completing changes fast rather than having correct
  code, we will fix later").
- Casts taken for speed, to be removed: `Rpc.serverLayer` casts its result and types its handler
  parameter as `Layer<any, …>` because the merged group's types do not line up with
  `RpcServer.layer`.

## Open questions

- Whether `Event.Bus` and `ConfigService` should be layer requirements of `ClientServicesLayer`
  (user's TODO) — the test context and `LocalClientServices` currently both pass `bus` and
  provide `Layer.succeed(Event.Bus, bus)` beneath, which is redundant.
- Whether the readiness gate change in D17 (fail the session instead of each request) loses the
  startup error the tab used to see; consider surfacing it through the framework instead.
- The stack handlers a session serves are a snapshot of the stack context at session open; after a
  reset closes the stack, existing sessions keep the old handlers until shutdown (a reset shuts the
  worker down anyway).
