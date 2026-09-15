# client-services-dissolve-host — Tasks

Design: [`./DESIGN.md`](./DESIGN.md). Branch `dm/client-services-refactor`, PR #13094.

_Resume: PAUSED mid-change 2026-09-15 with UNCOMMITTED work (14 files, see Phase 6). Last commit
`9129624c4f` (effect-native session server). The uncommitted tree has the framework-owned session
scope + tab session lock + `WorkerService` removal; worker-framework tests pass (13/13 in
`Client.test.ts`) but client-services fails to typecheck at `worker-runtime.ts:170` ("Expression
expected"). `worker-runtime.ts` also carries the user's own in-progress edits on top of the
agent's (bus provided via `Event.busLayer` and read with `yield* Event.Bus`, the wipe-storage
handler inlined, `WorkerSession` made non-exported), so the error is likely mid-edit state there,
not the session change. `Client.test.ts` has three `onTestFinished(() => x.close())` hooks whose
`Promise<Connection>` return type must be wrapped in an async block. No suites beyond
worker-framework have run since `e6b1bcdbf4`. CI on PR #13094 was red (4 test shards + check) on
`67edcada13`, caused by a composer-app typecheck failure since fixed; not re-checked since._

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

## Phase 4: Framework-owned session lifetime (UNCOMMITTED)

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
- [ ] Fix `Client.test.ts` `onTestFinished` return types (three sites: wrap in an async block).
- [ ] Fix client-services typecheck error at `worker-runtime.ts:170`.
- [ ] Rebuild chain (`protocols → client-protocol → worker-framework → client-services`),
      typecheck `client`, `client-e2e`, `composer-app`; format/lint/knip; commit; push.

## Phase 5: Verification (outstanding)

- [ ] Run `client-services`, `client`, `client-e2e`, `worker-framework`, `effect` suites
      (`moon run … -- --no-file-parallelism`); last full green was before `f1f97cad30`.
- [ ] Run the client browser tests (`sync-main-thread-lag.browser.test.ts`, dedicated worker
      paths) — the session lifetime change is browser-only in production.
- [ ] Composer e2e (`DX_ENVIRONMENT=dev`) for the dedicated worker: boot, second tab, tab close,
      reset from settings.
- [ ] Re-check CI on PR #13094 (Depot; `gh pr checks 13094`).

## Phase 6: Cleanup (outstanding)

- [ ] Remove the casts in `Rpc.serverLayer` (client-protocol `Rpc.ts`) — fix the merged-group typing.
- [ ] User TODO in `client-services-stack.ts`: `ConfigService` and `Event.Bus` as layer
      requirements rather than options; then drop the redundant `Layer.succeed(Event.Bus, bus)`
      in the test context and `LocalClientServices` (both currently do both).
- [ ] Decide D17's readiness-gate behaviour (startup error visibility to the tab).
- [ ] `docs`/comments: `packages/sdk/client-services/TASKS.md` still describes the old
      `ClientServicesHost` architecture; reconcile or point here.
- [ ] Changeset `.changeset/client-services-event-lifecycle.md` covers `@dxos/effect` only;
      rewrite as a summary of the whole PR before landing (client-services, client,
      worker-framework, client-protocol, protocols).
- [ ] Update memory `project-dissolve-client-services-host` (host is gone; goal moved to the
      worker framework scopes).
