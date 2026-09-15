# client-services-dissolve-host — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Branch `dm/client-services-refactor`, PR #13094.

_Resume: Branch pushed through `c1c387a7`; every suite that was red is green locally. THE BLOCKER
IS FIXED: `RpcGroup.toLayer` stores the handler functions and effect-rpc calls them unbound, so
serving each service's tag directly cost every class-backed impl its `this` — the first
private-field access threw during dispatch, where nothing carries the throw back to the caller, so
the request hung. Unary calls that never touched `this` still answered, which is why only streams
looked broken (`SystemService.queryStatus` never emitted, so a tab never left "waiting for
status"). `client-protocol` now exports `boundServiceHandlers` / `layerHandlersFromTag` and the
worker session uses them for all thirteen services. Also fixed: the `client-services` build break
(`WorkerSession` was not exported, which failed EVERY CI shard), the three browser `Worker session
lifetime` tests (they asserted on `sessionsOpened` before the worker had recorded the session), the
`Event.Bus` defect in the session-closed finalizer, the `client-services-stack.ts` TODO (config and
the bus are layer requirements now), `Rpc.serverLayer`'s typing, the stale
`packages/sdk/client-services/TASKS.md`, and the changeset (now a summary of the whole PR).

Green locally: `client` 34, `client-e2e` 174, `client-services` 190, `client-protocol`, `rpc`,
`effect`, `worker-framework` node (27) + browser (13); builds for the whole chain through
`composer-app`; lint and format clean. CI on the previous head (`2116d372`) was already green
except the two shards carrying `client:test` and `client-e2e:test`, both failing on exactly this
hang. NEXT: confirm CI on `c1c387a7`, then the browser `client` tests and Composer e2e
(`DX_ENVIRONMENT=dev`) for the dedicated worker, and decide D17's readiness-gate behaviour._

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
- [ ] Re-check CI on PR #13094 (Depot; `gh pr checks 13094`).

## Phase 6: Cleanup (outstanding)

- [x] `Rpc.serverLayer` is typed against its group and handler layer; only the timed branch
      still casts, where the middleware changes the handler tags' types.
- [x] `ClientServicesLayer` takes `ConfigService` and `Event.Bus` as layer requirements; every
      embedder provides them once beneath the layer.
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
