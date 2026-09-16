# client-services-dissolve-host — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Branch `dm/client-services-refactor`, PR #13094.

_Resume: CI IS FULLY GREEN on `4b7315e4` — all six test shards, check, memory, boot-budget, build
and Model Fixture pass, nothing failing, no merge conflict (15 behind main, clean).

The blocker was `RpcGroup.toLayer`: it reads own-enumerable properties and effect-rpc calls what it
stored unbound, so serving each service's tag directly both hid the prototype methods and lost
`this`. The failure lands in dispatch, where nothing carries it back to the caller, so the request
hung rather than failing — unary calls that never touched `this` still answered, which is why only
streams looked broken (`SystemService.queryStatus` never emitted, so a tab never left "waiting for
status"). `makeInProcessClient` already solved this inline; that logic is now
`normalizeHandlers` in `@dxos/protocols`, `@dxos/client-protocol` wraps it as
`layerHandlersFromTag`, and the worker session serves all thirteen services through it.

Also fixed in this pass: the `client-services` build break (`WorkerSession` was not exported, which
failed EVERY CI shard), the three browser `Worker session lifetime` tests (they asserted on
`sessionsOpened` before the worker had recorded the session), the `Event.Bus` defect in the
session-closed finalizer (which also leaked sessions and kept the worker alive), the
`client-services-stack.ts` TODO (config and the bus are layer requirements now), `Rpc.serverLayer`'s
typing (one cast left, behind `asTimedHandlers` with the invariant in its JSDoc), the stale
`packages/sdk/client-services/TASKS.md`, and the changeset (a summary of the whole PR, including
`@dxos/feed-store`).

Green locally too: `client` 34, `client-e2e` 174, `client-services` 190, `echo-client` 556,
`protocols`, `client-protocol`, `rpc`, `effect`, `worker-framework` node + browser. An adversarial
review of the diff ran and its findings are addressed. NEXT: reviewers; then Composer e2e
(`DX_ENVIRONMENT=dev`) for the dedicated worker and D17's readiness-gate decision._

## Phase 1: Event lifecycle in the stack (landed)

- [x] `Event` module in `@dxos/effect` (`make`, `on`, `handler`, `subscribe`, `emit`, `Bus`,
      `makeBus`, `busLayer`, exported `BusService`); tests.
- [x] Event catalog `packlets/services/events.ts`; storage/identity/network/space/readiness
      orchestration moved from the host into layer handlers (`storageLifecycleLayer`,
      `IdentityLifecycleLayer`, `NetworkLifecycleLayer`, `StackReadinessLayer`,
      `InvitationFactoriesLayer`, feed-sync wiring, replicators).
- [x] `NetworkingEnabled` as its own event; `autoConnect` option; `enableNetworking` for embedders.
- [x] Platform inputs as `ClientPlatformLayer` (edge clients, signal manager, `TransportFactoryService`).
- [x] Logging/devtools services as layers; `Tag` classes for `LoggingService`, `DevtoolsHost`,
      `SystemService`; `SystemServiceImpl` push-based status.
- [x] Reverted: serving RPC handlers as `Context<never>` (deferred; user dislikes `Context<never>`).
- [x] Dropped the `locks` packlet and `@dxos/lock-file`; knip/lint/format green at the time.

## Phase 2: Dissolve `ClientServicesHost` (landed)

- [x] `ClientServicesLayer` composes the whole runtime; requires the SQL services from beneath.
- [x] Test builder has its own `ServiceContext` over `ClientServicesLayer` (memory sqlite).
- [x] `LocalClientServices` composes the stack itself; one runtime; OPFS worker as an
      `acquireRelease` layer; reset closes only the stack so the in-process RPC can answer;
      storage wipe via `Effect.provide(sqliteLayerFromParams(params))`.
- [x] Worker runtime composes the stack itself; `service-host.ts` deleted; consumers inlined
      (`dedicated-worker.ts` `onStart(stack)`, composer worker reads `IdentityManagerService`
      from the stack, composer recovery reads `DevtoolsHostService`).
- [x] Replicators self-register; `createDiagnosticsFromHandlers`; unused `@dxos/websocket-rpc` dep removed.
- [x] Reset as `Closing → WipingStorage → Reset` on the embedder's bus; `SystemServiceImpl` takes a bus.
- [x] `SystemServiceLayer` in the stack; `services/handlers.ts` (`RpcServicesContext`,
      `rpcHandlersFromStack`, `handlersFromStack`); dead diagnostics broadcast removed.

## Phase 3: Worker runtime on layers and scopes (landed)

- [x] No `ManagedRuntime`: `Layer.build` into a forked stack scope; sqlite layer is a value.
- [x] Unused `acquireLock`/`releaseLock` options removed; `configProvider`/`onStop` are effects.
- [x] `Worker.run` owns the runtime scope until shutdown; `RuntimeHandle.stop` removed;
      `makeWorkerRuntime: Effect<WorkerRuntimeService, never, Scope>`; `requestShutdown` option.
- [x] `worker-session.ts` inlined into `worker-runtime.ts`; session as a scoped effect;
      `SessionClosed` event; `shellPort` removed.
- [x] Effect-native session server (`Rpc.serverLayer`, `layerClientServicesServer`) over stack tags.

## Phase 4: Framework-owned session lifetime (landed)

- [x] JSDoc on `RuntimeHandle.createSession` and `Options.createRuntime` describing each scope's lifetime.
- [x] `Worker.run`: session scope = `Scope.fork(runtimeScope)`; `createSession` acquires and
      returns; scope closed on tab session-lock release, supersede, or shutdown.
- [x] `sessionLockKey` on `request-port`/`start-session`; `Client.Connection` holds the lock per
      attempt (released when the attempt's ctx disposes); leader forwards it.
- [x] Worker runtime `createSession` acquires and returns; `WorkerSession = { bridgeService }`;
      callers drop `yield* session.closed`.
- [x] `WorkerService` deleted (protocols, `ClientServicesRpcs`, `ClientServicesHandlers`,
      `ClientServicesRpc`, tab-side call and lock in `dedicated-worker-client-services.ts`).
- [x] Tests in `worker-framework/src/Client.test.ts` ("Worker session lifetime"): stays open
      while connected; tab close releases the lock and closes the session scope; shutdown closes
      sessions before the runtime. Tab acks the worker's client transport (D18).
- [x] Fix `Client.test.ts` `onTestFinished` return types.
- [x] Fix the client-services typecheck error (`WorkerSession` was not exported for `events.ts`).
- [x] Rebuild chain (`protocols → client-protocol → worker-framework → client-services`),
      typecheck `client`, `client-e2e`, `composer-app`; format/lint; commit; push.
- [x] Browser `Worker session lifetime` tests await the recorded session before asserting.

## Phase 5: Verification (outstanding)

- [x] `client-services` (30 files), `client-protocol`, `rpc`, `effect`, `worker-framework`
      (node + browser) suites green.
- [x] `client:test` (34) and `client-e2e:test` (174) green, including the dedicated-worker suites.
- [ ] Run the client browser tests (`sync-main-thread-lag.browser.test.ts`, dedicated worker
      paths) — the session lifetime change is browser-only in production.
- [ ] Composer e2e (`DX_ENVIRONMENT=dev`) for the dedicated worker: boot, second tab, tab close,
      reset from settings.
- [x] CI green on PR #13094 after merging `main` (8fd51a5e); auto-merge (squash) enabled.

## Phase 6: Cleanup (outstanding)

- [x] `Rpc.serverLayer` is typed against its group and handler layer; only the timed branch
      still casts, where the middleware changes the handler tags' types.
- [x] `ClientServicesLayer` takes `ConfigService` and `Event.Bus` as layer requirements; every
      embedder provides them once beneath the layer.
- [ ] Rename `@dxos/effect`'s `Event` to `Hook` (wittjosiah, PR #13094): the module's semantics are
      Tapable's `AsyncParallelHook`/`AsyncSeriesHook` (an emit waits for every handler and a handler
      failure fails the emitter), not a bus's, and `Event` clashes with `@dxos/async`'s, which is why
      call sites alias it as `EffectEvent`. Touches the module, the `@dxos/effect/Event.Bus` context
      key and ~20 call sites. Deferred out of #13094, which landed with the semantics documented on
      `emit`.
- [ ] Decide D17's readiness-gate behaviour (startup error visibility to the tab).
- [ ] Typed errors via `BaseError.extend` (carried over from the deleted `client-services/TASKS.md`):
      `stop`, `createSession` and session open/close still wrap fallible work in bare
      `Effect.promise`, so a rejection becomes a defect.
- [ ] Consider serving the in-process and iframe paths through `layerHandlersFromTag` too, so the
      hand-written `makeClientServicesHandlers` binding is not the only guard against unbound
      handlers.
- [x] `packages/sdk/client-services/TASKS.md` points here instead of describing the old
      `ClientServicesHost` architecture.
- [x] The changeset is a summary of the whole PR (effect, client-services, client-protocol,
      worker-framework, client, protocols, rpc).
- [ ] Update memory `project-dissolve-client-services-host` (host is gone; goal moved to the
      worker framework scopes).
