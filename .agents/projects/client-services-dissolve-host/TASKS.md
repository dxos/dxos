# client-services-dissolve-host — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Branch `dm/client-services-refactor`, PR #13094.

_Resume: Branch pushed through `62901596` (cloud sandbox). Fixed since the last note: the
`client-services` build break (`WorkerSession` was not exported, which failed EVERY CI shard),
the three browser `Worker session lifetime` tests (they asserted on `sessionsOpened` before the
worker had recorded the session; they now await it), the `Event.Bus` defect in the worker's
session finalizer, the `client-services-stack.ts` TODO (config and the bus are layer
requirements now), `Rpc.serverLayer`'s typing, the stale `packages/sdk/client-services/TASKS.md`,
and the changeset (now a summary of the whole PR). Green locally: `client-services` 30 files /
`client-protocol` / `rpc` / `effect` / `worker-framework` node + browser, and builds for
`client-services`, `client`, `client-protocol`, `client-e2e`, `worker-framework`, `composer-app`.

OPEN, THE ONE REAL BLOCKER: every STREAMING rpc over a worker session hangs, so
`client:test`'s `dedicated-worker-client-services.test.ts` fails 5/7 (CI never reached it before,
because the build failed first). Evidence gathered: a unary rpc over a real worker session
answers in ~200ms, while `SystemService.queryStatus` over the same session never produces a
chunk; the request IS delivered and dispatched (`entry.handler` is the right impl, the fiber is
forked, `Stream.runForEachArray` runs) but the handler's stream is never pulled — its
`streamFromEmitter` registration never runs — so nothing is written back and the tab's
`client._open: waiting for status trigger` never resolves. Ruled out: the `RpcTiming` wrap
middleware (fails with `timing: false` too), `Layer.build` vs `ManagedRuntime` for the session
server, the breadth of the stack context handed to the handlers (narrowing it to the 13 service
tags changes nothing), and session-scope lifetime (the scope only closes at test teardown). The
same server path — `layerClientServicesServer` + `Rpcs.toLayer(Tag)` over a MessagePort, with
timing on, streaming, callback-registered streams, and a client that connects first — passes in
`effect-rpc.test.ts` (4 new tests), so the difference is something about the session's
arrangement, most likely the reverse-direction `RpcClient.layerProtocolWorker` the framework
merges into the same context (an UNPEERED one demonstrably stalls the forward server's streams;
see D18). NEXT: fix that, then rerun `client:test` and `client-e2e:test`._

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
- [ ] `client:test` — `dedicated-worker-client-services.test.ts` fails 5/7 on the streaming-rpc
      hang described in the resume note; everything else in the package passes.
- [ ] `client-e2e:test` — not reached (the run aborts on `client:test`).
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
- [x] `packages/sdk/client-services/TASKS.md` points here instead of describing the old
      `ClientServicesHost` architecture.
- [x] The changeset is a summary of the whole PR (effect, client-services, client-protocol,
      worker-framework, client, protocols, rpc).
- [ ] Update memory `project-dissolve-client-services-host` (host is gone; goal moved to the
      worker framework scopes).
