# client-services — Worker runtime refactor

_Resume: Phase 4 — make `ClientServicesHost` an Effect service (Context.Tag + Layer) and fold `ServiceContext` into it. Uncommitted: none. Last: Phase 3 landed — `ServiceRegistry` deleted; `ClientServicesHost` holds resolved handlers in a private `#handlers` field (set on open, reset on close); full Context-union serving deferred into Phase 4. Earlier: Phase 2 landed — `WorkerRuntime` is now a `Context.Tag` + `layerWorkerRuntime` with an Effect service surface (`start`/`stop`/`createSession`/`connectWebrtcBridge`), `WorkerSession.open`/`close` return Effects, call sites drop the `Effect.promise` bridges; builds/lint/tests green. Deviations from the sketch: lifecycle stays caller-driven (explicit `start`/`stop` Effects, not Layer finalizers) because `Worker.run` wraps `createRuntime` in `Effect.scoped` and resolves it immediately; runtime deps are passed via the `layerWorkerRuntime` factory options rather than separate `WorkerConfigProvider`/`StorageLock`/`SqliteLayer` tags; `WorkerSession` remains a class (state holder) with Effect open/close; readiness gate still a `Trigger`._

Remove the legacy shared-worker services path, then convert `WorkerRuntime` / `WorkerSession` from imperative Promise-based classes to Effect services (Context tags + Layers).

## Phase 1: Kill shared-worker

The `SHARED_WORKER` services mode already throws in `createClientServices`; the remaining work is deleting the parallel plumbing (entrypoints, exports, env toggles, and `WorkerRuntime.manageLifecycle`).

### Tasks

- [x] **Audit shared-worker consumers**
  - `packages/sdk/client/src/worker/onconnect.ts` — legacy SharedWorker runtime bootstrap + `getWorkerClientServices` / `getWorkerConfig` / `getWorkerServiceHost`
  - `packages/sdk/client/src/worker/index.ts` and `packages/sdk/react-client/src/worker.ts` re-exports
  - `packages/apps/composer-app/src/workers/shared-worker.ts` — observability + IDB log store in shared worker
  - `packages/apps/testbench-app/src/shared-worker.ts`
  - `packages/apps/composer-app/src/main.tsx` — `DX_SHARED_WORKER` env, iOS fallback, memory SQLite branch
  - `docs/legacy/guide/snippets-react/shared-worker.ts`
  - `packages/e2e/rpc-tunnel-e2e/src/test-worker.ts`
  - Vite / build wiring: `packages/apps/composer-app/vite.config.ts` (shared-worker entry if present)
- [x] **Migrate composer observability off shared-worker**
  - Move IDB log store + `ObservabilityProvider.Client.identityProvider` setup from `shared-worker.ts` into the dedicated-worker path (`dedicated-worker.ts` / `dedicated-worker-entrypoint.ts` + `onBeforeStart` hook)
  - Confirm tracing / log replay still works when services run in dedicated worker (buffering backend in `TRACE_PROCESSOR`)
- [x] **Delete shared-worker entrypoints and exports**
  - Remove `packages/sdk/client/src/worker/` packlet (or reduce to empty barrel if something must remain)
  - Remove `packages/apps/composer-app/src/workers/shared-worker.ts`
  - Remove `packages/apps/testbench-app/src/shared-worker.ts`
  - Remove legacy docs snippet
- [x] **Simplify app services-mode selection**
  - `composer-app/main.tsx`: drop `DX_SHARED_WORKER`, `useSharedWorker`, iOS SharedWorker workaround, and memory-SQLite branch; default to `DEDICATED_WORKER` (or `HOST` when `DX_HOST`)
  - `packages/sdk/client/src/client/client.ts`: remove `SHARED_WORKER` default mapping if still present
- [x] **Remove dead config / API surface**
  - `client-services-factory.tsx`: drop deprecated `createWorker?: () => SharedWorker` option and `SHARED_WORKER` case (already throws — delete entirely)
  - Proto enum `SHARED_WORKER` in `config.proto` / `services.proto`: deprecate or reserve; update `platform.ts`, devtools labels, story fixtures, effect-proto test
  - `packages/common/log/src/platform/browser/index.ts` comment referencing `onconnect.ts`
- [x] **Strip `WorkerRuntime` shared-worker-only code**
  - Remove `manageLifecycle` option and BroadcastChannel displacement from `worker-runtime.ts` (dedicated path sets `manageLifecycle: false`; worker-framework owns displacement)
  - Remove `clientConfigOverlay` / per-connection config seeding pattern from deleted `onconnect.ts` — dedicated worker receives config once at init via worker-framework
- [x] **Verify**
  - `moon run client-services:build client:build`
  - `moon run client-e2e:test` (or targeted e2e that exercise dedicated worker)
  - Composer boots with `DEDICATED_WORKER` and observability intact

### References

- `packages/sdk/client/src/services/dedicated/dedicated-worker.ts` — replacement runtime path
- `packages/sdk/worker-framework/src/Worker.ts` — owns liveness, displacement, session protocol
- `packages/sdk/client/src/services/client-services-factory.tsx` — services mode switch (already rejects `SHARED_WORKER`)

---

## Phase 2: Convert `WorkerRuntime` + `WorkerSession` to Effect

Replace the imperative class + `async`/`Promise` API with Effect services: Context tags for dependencies/state, Layers for construction, and `Effect.gen` programs for lifecycle.

### Design sketch

| Current                                                                  | Target                                                                       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `class WorkerRuntime` with ctor side effects                             | `WorkerRuntime` Context.Tag + `WorkerRuntimeLive` Layer                      |
| `class WorkerSession` constructed by runtime                             | `WorkerSession` tag (or session handle returned from `createSession` Effect) |
| `start()` / `stop()` / `createSession()` Promises                        | `Effect.Effect<…, WorkerRuntimeError, …>` programs on the service interface  |
| `Trigger` readiness gate                                                 | `Deferred` or `Effect.async` / subscription in Layer finalizer               |
| `Set<WorkerSession>` session registry                                    | `Ref` or service-held state inside Layer scope                               |
| `dedicated-worker.ts` `Effect.promise(() => runtime.createSession(...))` | `yield* WorkerRuntime.createSession(...)`                                    |

### Tasks

- [x] **Define services and errors**
  - `WorkerRuntime` tag: `start`, `stop`, `createSession`, `connectWebrtcBridge`, `updateSignalMetadata`, `host` accessor
  - `WorkerSession` tag (or opaque handle): `open`, `close`, `origin`, `bridgeService`
  - Typed errors via `BaseError.extend` (`WorkerRuntimeStartError`, `WorkerSessionOpenError`, …) — no bare `Error` in `Effect<A, E, R>`
- [x] **Define config / dependency tags**
  - Extract options currently on `WorkerRuntimeOptions` into injectable tags: `WorkerConfigProvider`, `StorageLock` (`acquire`/`release`), `SqliteLayer`, `WorkerLifecyclePolicy` (if anything remains after Phase 1)
  - `ClientServicesHost` — Phase 4 defines Context tag + Layer; Phase 2 `WorkerRuntime` Layer depends on it
- [x] **Implement `WorkerRuntimeLive` Layer**
  - Port `start` init sequence (config resolve → host initialize/open → identity tags → ready signal) to `Effect.gen`
  - Port `stop` teardown (sessions, host close, scope close, runtime dispose, `onStop`) with `Effect.ensuring` / Layer finalizers
  - Port session registry + WebRTC bridge selection (`_reconnectWebrtc`, `_sessionForNetworking`) to `Ref`-backed state
  - Keep `RtcTransportProxyFactory` as mutable bridge holder inside Layer closure or its own tag
- [x] **Implement `WorkerSessionLive`**
  - Port `WorkerSession.open` / `close` to Effect: RPC server open, `makeBridgeServiceClientOverProtocol`, `WorkerService.start` gate, navigator lock watcher
  - Replace `Callback` / `setTimeout` stop with `Effect.forkDaemon` or scheduler if needed
- [x] **Update call sites (Promise → Effect)**
  - `packages/sdk/client/src/services/dedicated/dedicated-worker.ts` — build runtime via Layer; `createSession` returns `Effect.never` without `Effect.promise` bridges
  - `packages/sdk/client/src/testing/test-worker-factory.ts` — same
  - Export Layer + tags from `packages/sdk/client-services/src/packlets/worker/`
- [x] **Delete or thin legacy classes**
  - Remove `class WorkerRuntime` / `class WorkerSession` once Layer-backed services ship, or keep classes as thin wrappers only if external API requires it (prefer tags)
  - Update `worker-runtime.ts` / `worker-session.ts` tests; add Layer integration test if unit coverage is thin
- [x] **Verify**
  - `moon run client-services:test -- src/packlets/worker/`
  - `moon run client:test` (dedicated-worker-client-services tests)
  - Manual: dedicated worker session open/close, WebRTC bridge on owner tab, worker stop on last session

### References

- `.claude/skills/effect/SKILL.md` — Context.Tag, Layer, `Effect.gen`, typed errors
- `.claude/skills/context-propagation/SKILL.md` — `ClientServicesHost` as downstream root; propagate `ctx` where `@trace.span` applies
- `packages/sdk/worker-framework/src/Worker.ts` — `RuntimeHandle.createSession` already returns `Effect.Effect<never, …>`; align shapes

---

## Phase 3: Eliminate `ServiceRegistry` — handlers from Effect `Context`

`ServiceRegistry` is a mutable `Partial<ClientServicesHandlers>` bag that `ClientServicesHost` populates on open and tears down on close. The per-service RPC handler tags already exist in `client-services-layer.ts` (`IdentityServiceRpc`, `SpacesServiceRpc`, …); this phase wires serving and in-process bridging directly from Context instead of copying handlers into a registry object.

### Design sketch

| Current                                                                        | Target                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `ServiceRegistry<ClientServicesHandlers>` + `setServices()` on open/close      | Handlers live in the Layer scope; no mutable re-assignment                                       |
| `serviceHost.serviceRegistry.services` / `services` getter                     | `Context` union of RPC tags (+ `SystemService`, `LoggingService`, `DevtoolsHost` tags as needed) |
| `services: () => ({ ...registry.services, WorkerService })` in `WorkerSession` | `makeClientServicesHandlers` built from `yield*` / `Context.get` per tag                         |
| `makeInProcessClientServicesRpc(() => this._serviceRegistry.services)`         | `makeInProcessClientServicesRpc` (or successor) reads handlers from provided Context/Layer       |
| `close()` resets registry to `{ SystemService }` only                          | Layer finalizer / scoped Context teardown                                                        |

### Tasks

- [x] **Define remaining handler tags**
  - Confirmed `SystemService`, `LoggingService`, `DevtoolsHost` stay host-local impls merged at serve time (no Context tag). The per-service RPC tags in `client-services-layer.ts` already back the rest; a dedicated `ClientServicesHandlersContext` union is deferred to Phase 4 where the host becomes a Layer.
- [x] **Serve RPC from Context**
  - Replaced the `ServiceRegistry` bag with a private `#handlers` field on `ClientServicesHost`, resolved from the Layer stack on `open()` and reset on `close()`; the `services` accessor returns it directly.
  - `worker-session.ts`: dropped the `serviceRegistry.services` spread in favour of `this._serviceHost.services`.
  - NOTE: full Context-union serving (`ClientRpcServer` / `makeClientServicesHandlers` pulling per-tag from Context) folds into Phase 4 once the host is Layer-backed.
- [x] **Update in-process bridge**
  - `makeInProcessClientServicesRpc` already takes a lazy `() => Partial<ClientServicesHandlers>` thunk (Context-agnostic); `getDiagnostics` now feeds it `() => this.#handlers`. Signature change to accept a Context/Layer deferred to Phase 4.
- [x] **Delete `ServiceRegistry`**
  - Removed `service-registry.ts`, `service-registry.test.ts`, the `serviceRegistry` getter, and the `setServices` / `addService` / `removeService` API.
- [x] **Verify**
  - `moon run client-services:build client-services:lint client:build` — green.
  - `moon run client-services:test` — 154 passed / 3 skipped (effect-rpc + service-context wiring intact).

### References

- `packages/sdk/client-services/src/packlets/services/client-services-layer.ts` — existing per-service RPC Context tags
- `packages/sdk/client-protocol/src/service-rpc.ts` — `ClientServicesHandlers`, `makeClientServicesHandlers`, `ClientRpcServer`
- `packages/sdk/client-services/src/packlets/services/service-host.ts` — `setServices` on open/close (lines ~362, ~428)

---

## Phase 4: `ClientServicesHost` as Effect service; fold in `ServiceContext`

Today `ClientServicesHost` is an imperative class that builds a `ManagedRuntime` over `ServiceContextLayer` + `ClientServicesRpcLayer`, resolves `ServiceContextService`, then separately opens the host (`serviceContext.open`, `identityService.open`). `ServiceContext` is a second lifecycle orchestrator (`Resource` with `_open`/`_close` stages: migrate → identity → network → `_initialize`). Collapse to a single `ClientServicesHost` Context tag + Layer that owns the full stack and lifecycle.

**Depends on:** Phases 2–3 can proceed against the current class; Phase 4 should land before deleting the legacy `ClientServicesHost` class. `WorkerRuntime` / `LocalClientServices` should eventually consume `ClientServicesHost` via Layer rather than `new ClientServicesHost()`.

### Design sketch

| Current                                                                        | Target                                                                                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `class ClientServicesHost` + `open(ctx)` / `close(ctx)` Promises               | `ClientServicesHost` Context.Tag + `ClientServicesHostLive` Layer                                              |
| `ServiceContext` class + `ServiceContextService` tag                           | Removed — lifecycle programs live on `ClientServicesHost` service                                              |
| `ServiceContextLayer` + separate host `open()` calling `serviceContext.open()` | Single Layer composes component tags + RPC handlers; host `open`/`close` are `Effect` programs over that scope |
| `service-host.open` resolves handlers then copies to `ServiceRegistry`         | Handlers resolved from same Layer scope (feeds Phase 3)                                                        |
| Tests/devtools/diagnostics take `ServiceContext`                               | Take `ClientServicesHost` tag or underlying component tags directly                                            |

### Tasks

- [ ] **Define `ClientServicesHost` Context tag + Layer**
  - `ClientServicesHost` tag interface: `open`, `close`, `reset`, `isOpen`, `handlers` (or per-tag Context access), `exportSqliteDatabase`, diagnostics hooks
  - `ClientServicesHostLive` Layer: compose `ServiceContextLayer` stack pieces + `ClientServicesRpcLayer` + host-local services (`SystemService`, `LoggingService`, `DevtoolsHost`)
  - Replace `ClientServicesHostProps` ctor bag with Layer input tags: `Config`, `SignalManager`, `TransportFactory`, `RuntimeProvider`, `runtimeProps`, callbacks
  - Typed errors for open/close/reset (`ClientServicesHostOpenError`, …)
  - Export from `packages/sdk/client-services` packlet; update `WorkerRuntime`, `LocalClientServices`, test builders to `Layer.launch` / `ManagedRuntime` over `ClientServicesHostLive`
- [ ] **Remove `ServiceContext` + `ServiceContextService`; merge lifecycle into host**
  - Port `ServiceContext._open` stages into `ClientServicesHost.open` Effect program: storage migrate, sqlite health check, identityManager open, `_setNetworkIdentity`, edge/signal/network open, replicator wiring, metadata load, space manager, conditional `_initialize`, feed syncer, persistent invitations
  - Port `ServiceContext._close` teardown into `ClientServicesHost.close` Effect program (reverse order + Layer finalizers)
  - Port `ServiceContextApi` surface (`createIdentity`, `getInvitationHandler`, `broadcastProfileUpdate`, `_acceptIdentity`) onto `ClientServicesHost` tag or thin helpers that `yield*` component tags
  - Keep `ServiceContextLayer` component composition (keyring, feed store, echo host, …) but drop `serviceContextServiceLayer` / `new ServiceContext(...)` factory — host Layer yields component tags directly
  - Replace `ServiceContextService` dependencies in `client-services-layer.ts` RPC handlers with direct component-tag deps or a slim readiness gate on `ClientServicesHost`
  - Delete `service-context.ts` class (retain or relocate `ServiceContextLayer` / `ServiceContextRuntimeProps` if still needed as internal composition)
- [ ] **Update downstream consumers of `ServiceContext`**
  - `test-builder.ts` `createServiceContext` → `createClientServicesHost` or Layer-based peer factory
  - Devtools/diagnostics (`diagnostics.ts`, `devtools/spaces.ts`, `devtools/metadata.ts`) — accept host tag or `IdentityManagerService` / `DataSpaceManagerService` directly
  - E2E + unit tests referencing `ServiceContext` type (`invitations.test.ts`, `service-context.test.ts`, invitation-utils, per-service `*.test.ts`)
- [ ] **Verify**
  - `moon run client-services:test`
  - `moon run client-e2e:test` (invitations, spaces, identity)
  - Identity create/recover, space open, invitation flows unchanged

### References

- `packages/sdk/client-services/src/packlets/services/service-host.ts` — current host open/close + `ManagedRuntime` over `ServiceContextLayer`
- `packages/sdk/client-services/src/packlets/services/service-context.ts` — `ServiceContext` lifecycle (`_open` ~L326, `_close` ~L389, `_initialize`)
- `packages/sdk/client-services/src/packlets/services/client-services-layer.ts` — RPC handlers that `yield* ServiceContextService`
