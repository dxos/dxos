# Context Propagation Audit

Audit of `ctx: Context` propagation compliance for distributed tracing (DX-868 / DX-765).
Rules: [SKILL.md](./SKILL.md). Out of scope: RPC client-service boundary.

---

## Summary

The PR wires `ctx: Context` through most of the networking and space lifecycle stack. The OTEL bridge maps DXOS span IDs to OpenTelemetry contexts and propagates `traceparent` in both WebSocket messages and HTTP requests. Browser auto-instrumentation (fetch, XHR, document-load) is disabled — all trace propagation is explicit via `ctx`.

All interface-level changes have been resolved.

---

## Fixed in this pass — invitation accept flow

### P0 — orphan root in space invitation accept

| Location                                                                                 | Method                           | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/sdk/client-services/src/packlets/invitations/space-invitation-protocol.ts:185` | `SpaceInvitationProtocol.accept` | Was calling `this._spaceManager.acceptSpace(Context.default(), {...})` → orphan root `DataSpaceManager.acceptSpace` span on every space invitation redemption. Fixed by adding `ctx: Context` as first parameter to `InvitationProtocol.accept(ctx, response, request)`; `SpaceInvitationProtocol.accept` now forwards it to `acceptSpace(ctx, ...)`. Callers in `invitations-handler` (guest flow + edge `onInvitationSuccess` callback) now pass the invitation-flow ctx. `EdgeInvitationHandlerCallbacks.onInvitationSuccess` signature extended to `(ctx, response, request)` and `_handleSpaceInvitationFlow` forwards its own traced ctx. `DeviceInvitationProtocol.accept(ctx, ...)` accepts ctx but doesn't use it (device accept uses `ServiceContext._ctx` internally). |

### P0 follow-up — `acceptSpace` fire-and-forget pipeline init uses disposed ctx

| Location                                                                     | Method                         | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:394` | `DataSpaceManager.acceptSpace` | After threading the invitation ctx into `acceptSpace`, `space.initializeDataPipelineAsync(ctx)` inherited that ctx as its trace parent. But the invitation flow disposes the ctx synchronously after `acceptSpace` returns (`guardedState.complete → ctx.dispose`), which cascades to the `@trace.span`-derived child that `initializeDataPipelineAsync` stored — causing the detached pipeline init to run with a disposed ctx and never reach READY. Changed to `space.initializeDataPipelineAsync(this._ctx)` so the detached task is parented to the DSM lifecycle span (mirrors the existing `postOpen → connectToSpace(this._ctx, …)` fix). |

### P1 — invitation guest ctx not derived from caller

| Location                                                                               | Method                                                      | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/sdk/client-services/src/packlets/invitations/invitations-manager.ts:128,294` | `acceptInvitation` / `_createObservableAcceptingInvitation` | `acceptInvitation(_ctx, request)` was dropping the caller ctx and `_createObservableAcceptingInvitation` constructed `new Context({ onError })` with no parent chain, so the manual `invitation.guest` span in `InvitationsHandler.acceptInvitation` was orphaned when the caller (`InvitationsServiceImpl.acceptInvitation` via RPC Stream ctx) had a traced ctx. Fixed by threading ctx through `acceptInvitation(ctx, ...)` → `_createObservableAcceptingInvitation(parentCtx, ...)` which now does `parentCtx.derive({ onError })`. |

---

## Resolved — interface changes completed

| Location                   | Method                | Resolution                                                                                                                                                                                                   |
| -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `automerge-data-source.ts` | `getChangedObjects()` | Added `ctx: Context` as first parameter to `IndexDataSource` interface, `IndexEngine.update()`, `IndexEngine.#update()`. `AutomergeDataSource` now forwards caller ctx to `loadDoc()`.                       |
| `echo-edge-replicator.ts`  | `connect()`           | Added `ctx: Context` as first parameter to `AutomergeReplicator.connect()`. `EchoEdgeReplicator` now derives lifecycle context from caller ctx via `ctx.derive()` instead of `Context.default()`.            |
| `queue-query-context.ts`   | `start()`             | `QueueQueryContext` now receives parent lifecycle ctx via constructor from `QueueImpl._ctx`. `start()` derives run-scoped context from parent via `this.#parentCtx.derive()` instead of `Context.default()`. |

---

## P2 — `this._ctx` vs caller `ctx` (reviewed, kept)

| Location                         | Pattern                                                                     | Rationale                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SpaceProxy._initializeDb(_ctx)` | `cancelWithContext(this._ctx, ...)` and `scheduleMicroTask(this._ctx, ...)` | Lifecycle-scoped cancellation: property wait and microtasks should abort when the proxy is disposed, not when the initialization caller is disposed. `_ctx` is consumed by `@trace.span()` for trace hierarchy. |
| `DataSpace._createWritableFeeds` | `notarize({ ctx: this._ctx })` inside `initializeDataPipeline(ctx)` chain   | Notarization must survive beyond the initialization context. `this._ctx` ensures cancellation only when the space itself is disposed.                                                                           |

---

## P3 — Unused `ctx` parameters (interface compliance)

These methods accept `ctx` / `_ctx` to satisfy interface contracts but don't use it in the body. No `@trace.span()` decorator either. Not a bug — documented for future wiring.

| Method                                                   | Interface                     |
| -------------------------------------------------------- | ----------------------------- |
| `Connection.signal(_ctx)`                                | Inbound signal path           |
| `Peer.onOffer(_ctx)` / `Peer.onSignal(ctx)`              | Inbound signal path           |
| `SignalClient.join/leave/sendMessage(_ctx)`              | `SignalMethods`               |
| `MemorySignalManager.join/leave/query/sendMessage(_ctx)` | `SignalMethods`               |
| Various `Resource._open/_close(ctx)` overrides           | `Resource` lifecycle contract |

---

## Correctly implemented

These areas are properly wired:

- **EdgeClient.send(ctx)** → extracts OTEL span → injects `message.traceContext` with `traceparent`/`tracestate`.
- **EdgeHttpClient.\_call(ctx)** → `getTraceHeaders(ctx)` extracts OTEL context → injects `traceparent`/`tracestate` as HTTP headers on every `fetch` request.
- **Browser OTEL setup** → auto-instrumentation disabled (fetch, XHR, document-load). All trace propagation is explicit via `ctx`. `W3CTraceContextPropagator` registered for `propagation.inject`.
- **EdgeSignalManager** → `join`, `leave`, `query`, `sendMessage` forward `ctx` to `this._edgeConnection.send(ctx, ...)`.
- **Messenger.sendMessage(ctx)** → `_encodeAndSend(ctx)` → `signalManager.sendMessage(ctx)`.
- **SwarmMessenger** → `signal`, `offer`, `receiveMessage` forward `ctx` through callbacks.
- **NetworkManager.joinSwarm(ctx)** → `signalConnection.join(ctx)` → `signalManager.join(ctx)`.
- **AutomergeHost bundle path** → `_handleCollectionSync(ctx)` → `_pushInBundles(ctx)` → `_pushBundle(ctx)` → adapter → `EdgeHttpClient.importBundle(ctx)`.
- **EchoEdgeReplicator.connectToSpace(ctx)** — `@trace.span()`, forwards ctx.
- **DataSpaceManager.createSpace(ctx)** → `_constructSpace(ctx)` → `space.open(ctx)` → `initializeDataPipeline(ctx)`.
- **EchoHost.openSpaceRoot(ctx)** / `createSpaceRoot(ctx)` — forward `ctx` to `loadDoc(ctx)` and `flush(ctx)`.
- **Identity.open(ctx)**, `close(ctx)`, `joinNetwork(ctx)` → forward to `space.open/close/startProtocol(ctx)`.
- **SpaceProtocol.start(ctx)** → `networkManager.joinSwarm(ctx)`.
- **RemoteTracing** → maps DXOS span IDs ↔ OTEL contexts, passes `parentContext`, provides `wrapExecution`.
- **@trace.span() decorator** → extracts `ctx` from `args[0]`, derives child ctx, wraps execution in OTEL context.
- **TraceContext proto** on `Message` for WS-level distributed tracing.
- **SpaceList.\_open(ctx)** / `_close(ctx)` → `@trace.span()` with `ctx` first parameter.
- **ServiceHost.close(ctx)** → `@Trace.span()` with `ctx` first parameter.
- **ControlPipeline.start(ctx)** → passes caller's `ctx` to `_consumePipeline`.
- **Swarm.onOffer(ctx)** → forwards `ctx` to `Peer.onOffer(ctx, message)`.
- **IdentityManager.createIdentity/prepareIdentity** → accept optional `ctx`, forward to `identity.open(ctx)`.
- **AutomergeHost.waitUntilHeadsReplicated(ctx)** → forwards `ctx` to `loadDoc(ctx)`.
- **QueryExecutor.\_loadFromAutomerge/\_loadFromDXN** → use `this._ctx` (Resource lifecycle) for `loadDoc`.
- **DocumentsSynchronizer.addDocuments** → uses `this._ctx` (Resource lifecycle) for `loadDoc`.
- **IdentityServiceImpl.\_createDefaultSpace(ctx)** → forwards `ctx` to `createDefaultSpace(ctx)`.
- **IdentityServiceImpl.\_fixIdentityWithoutDefaultSpace** → uses `this._ctx` for `space.open` and `initializeDataPipeline`.
- **DataSpaceManager.\_getSpaceRootDocument(ctx)** → forwards `ctx` to `loadDoc(ctx)`.
- **DataSpaceManager trace.diagnostic callback** → uses `this._ctx` for `loadDoc`.

---

## Resource open/close context audit

Resources with `@trace.resource()` **and** `@trace.span()` methods. Only these need `this._ctx` trace-awareness (rule is soft).

### Correctly propagated

| Class                         | File                                         | Notes                                                                                                                          |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Space`                       | `echo-pipeline/.../space.ts`                 | `_open` has `@trace.span()`, forwards `ctx` to `_controlPipeline.start(ctx)`. `_close` forwards `ctx` to `protocol.stop(ctx)`. |
| `Identity`                    | `client-services/.../identity.ts`            | `open`/`close` have `@trace.span()`, forward `ctx` to `space.open(ctx)` / `space.close(ctx)`.                                  |
| `DataSpaceManager`            | `client-services/.../data-space-manager.ts`  | `createSpace`/`acceptSpace` have `@trace.span()`, forward `ctx` to `_constructSpace`, `open`, pipelines.                       |
| `AutomergeDocumentLoaderImpl` | `echo-db/.../automerge-doc-loader.ts`        | `loadSpaceRootDocHandle(ctx)` forwards to `_initDocHandle(ctx)`.                                                               |
| `InvitationsManager`          | `client-services/.../invitations-manager.ts` | `createInvitation(ctx)` propagates through.                                                                                    |
| `ControlPipeline`             | `echo-pipeline/.../control-pipeline.ts`      | `start(ctx)` passes `ctx` into `_consumePipeline(ctx)`.                                                                        |

### Fixed in this pass

| Class                    | File                                        | Fix                                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AutomergeHost._open`    | `echo-pipeline/.../automerge-host.ts`       | Now passes `ctx` to `_collectionSynchronizer.open(ctx)` and `close(ctx)`.                                                                                                                                                                                       |
| `DataSpace._close`       | `client-services/.../data-space.ts`         | Now passes `ctx` to `_inner.close(ctx)` (was calling without ctx).                                                                                                                                                                                              |
| `EchoHost._open`         | `echo-pipeline/.../echo-host.ts`            | Now passes `ctx` to `_automergeHost.open(ctx)` (was calling without ctx).                                                                                                                                                                                       |
| `ServiceContext._open`   | `client-services/.../service-context.ts`    | Now passes `ctx` to `dataSpaceManager.open(ctx)` (in `_initialize(ctx)`) and `edgeAgentManager.open(ctx)`. `networkManager`/`spaceManager` kept on zero-arg `open()` - they are not `Resource`-based and not traced, so they do not contribute to orphan roots. |
| `DataSpaceManager._open` | `client-services/.../data-space-manager.ts` | Added `ctx: Context` parameter and `@trace.span({ op: 'lifecycle' })`. Auto-activation and `_constructSpace` now forward the caller `ctx` instead of a bare `this._ctx`, so `space.activate(ctx)` -> `initializeDataPipeline(ctx)` has a live parent span.      |
| `DataSpaceManager`       | `client-services/.../data-space-manager.ts` | Promoted to `@trace.resource({ lifecycle: true })`. The `postOpen` `connectToSpace` closure now uses `this._ctx` (lifecycle span) instead of the captured `_constructSpace` ctx, which could be disposed by the time `postOpen` fires.                          |

### Accepted patterns (no change needed)

| Class                         | File                                        | Pattern                                                                 | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SpaceList._open`             | `client/.../space-list.ts`                  | Creates `this._ctx = new Context()` (ignores `ctx` param for lifecycle) | Client-side class; `this._ctx` is for detached stream subscriptions / microtasks. `@trace.span()` on `_open` covers the span hierarchy.                                                                                                                                                                                                                                                                                                                                          |
| `SpaceList._close`            | `client/.../space-list.ts`                  | `ctx` param unused in body                                              | Close disposes `this._ctx` and tears down streams; no downstream methods that need caller ctx.                                                                                                                                                                                                                                                                                                                                                                                   |
| `SpaceProxy._initializeDb`    | `client/.../space-proxy.ts`                 | `_ctx` param unused; uses `this._ctx` for `cancelWithContext`           | Lifecycle-scoped cancellation for property waits. Documented in P2.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `EchoEdgeReplicator`          | `echo-pipeline/.../echo-edge-replicator.ts` | `connectToSpace(ctx)` underuses `ctx` in body                           | Class does NOT extend `Resource`. `connect(ctx, ...)` stores `this._ctx = ctx.derive()`, which inherits `TRACE_SPAN_ATTRIBUTE` (a W3C string) from the caller's ctx via the parent chain. The string is stored indefinitely — there is no eviction. Reconnect/restart calls (`_handleReconnect`, restart scheduled task) both pass `this._ctx` to `_openConnection`, which keeps them under the originating `ServiceContext._open` span. No fragility found; P3 is not required. |
| `AutomergeHost#0.flush` (RPC) | `echo-pipeline/.../data-service.ts`         | Called with `Context.default()` from RPC handler                        | RPC boundary — accepted trace root.                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Design note: Resource base class and `this._ctx`

`Resource.#internalCtx` (`this._ctx`) is now recreated in `#open()` with `parent: #parentCtx`. This gives `getAttribute('dxos.trace-span')` access to the caller's trace span ID via the parent chain. Background/lifecycle work using `this._ctx` as `parentCtx` now becomes a child of the opening caller's span instead of an orphaned root.

This does NOT create disposal linkage — the `parent` field is only used for attribute lookup by `Context.getAttribute()`. `#internalCtx` is still disposed independently by `Resource.#close()`.

**Impact:** `QueryServiceImpl._executeQueries`, `CoreDatabase._emitDbUpdateEvents`, `CollectionSynchronizer` manual spans, and other `this._ctx`-based background work now appear as children of their opening caller span in OTEL traces.

---

## OTEL bridge notes

1. **Parent span already ended.** Not an issue in this codebase. `TRACE_SPAN_ATTRIBUTE` stores a W3C `traceparent` string (plain text) on the DXOS `Context`. The OTEL backend (`traces-browser.ts`) calls `propagation.extract()` from that string to reconstruct the OTEL parent context — no live OTEL object needs to be held, and there is no eviction. The string remains valid indefinitely on the parent chain as long as the `Context` exists.

2. **Spans created before `TRACE_PROCESSOR.tracingBackend` is set.** Early startup spans have no backend registered. `BufferingTracingBackend` in `@dxos/tracing` holds these spans and replays them once the real backend registers (set by `OtelTraces.start()` in `traces-browser.ts`).

3. **Sampling.** The browser build uses `ParentBasedSampler({ root: TraceIdRatioBasedSampler(0.3) })`. This samples 30% of root spans and keeps or drops the entire subtree consistently — it does not create orphans. Set `localStorage.setItem('dxos.debug.traceAll', 'true')` to force `AlwaysOnSampler` for debugging.

---

## Resolved in this PR

| Item                                                                            | Resolution                                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `EdgeHttpClient._call` missing trace headers                                    | Added `getTraceHeaders(ctx)` — injects `traceparent`/`tracestate` into fetch requests.                                                      |
| `StackContextManager` async limitation                                          | Removed. DXOS relies on explicit `ctx` passing, not OTEL `ContextManager`.                                                                  |
| Fetch/XHR/document-load auto-instrumentation                                    | Disabled — all three produce orphaned root spans without a context manager.                                                                 |
| `ServiceContext._acceptIdentity` using `new Context()`                          | Changed to `this._ctx`.                                                                                                                     |
| `EchoHost.openSpaceRoot` / `createSpaceRoot` missing `ctx`                      | Added `ctx` as first parameter; all callers updated.                                                                                        |
| `DataSpace._onNewAutomergeRoot` using `Context.default()` for `loadDoc`         | Changed to `this._ctx`.                                                                                                                     |
| `devices-service.test.ts` passing `Context.default()` to `createIdentity`       | Fixed — `createIdentity` takes `CreateIdentityOptions`, not `Context`.                                                                      |
| `SpaceList._open/_close` missing `ctx`                                          | Added `ctx: Context` first parameter; threaded through `ClientRuntime`.                                                                     |
| `ServiceHost.close()` missing `ctx`                                             | Added `ctx: Context` first parameter; all callers updated.                                                                                  |
| `ControlPipeline.start` passing `this._ctx` to `_consumePipeline`               | Changed to pass caller's `ctx`.                                                                                                             |
| `Swarm.onOffer` dropping `ctx` before `Peer.onOffer`                            | Added `ctx` to `Peer.onOffer` signature; `Swarm.onOffer` now forwards it.                                                                   |
| `AutomergeHost.addReplicator/removeReplicator` excessive propagation            | Reverted — `ctx` was unused (no `@trace.span()`, not forwarded). Removed `ctx` parameter from both methods and their callers in `EchoHost`. |
| `IdentityManager.createIdentity/prepareIdentity` using `new Context()`          | Added optional `ctx` parameter; callers pass `ctx` when available.                                                                          |
| `DataSpaceManager._getSpaceRootDocument` using `Context.default()`              | Added `ctx` parameter; `createDefaultSpace(ctx)` passes it through.                                                                         |
| `DataSpaceManager` trace.diagnostic `loadDoc(Context.default())`                | Changed to `this._ctx`.                                                                                                                     |
| `DocumentsSynchronizer.addDocuments` using `Context.default()`                  | Changed to `this._ctx` (Resource lifecycle).                                                                                                |
| `AutomergeHost.waitUntilHeadsReplicated` using `Context.default()`              | Added `ctx` parameter; RPC handler passes `Context.default()`.                                                                              |
| `QueryExecutor._loadFromAutomerge/_loadFromDXN` using `Context.default()`       | Changed to `this._ctx` (Resource lifecycle).                                                                                                |
| `IdentityServiceImpl._createDefaultSpace` using `Context.default()`             | Added `ctx` parameter; callers pass `this._ctx`.                                                                                            |
| `IdentityServiceImpl._fixIdentityWithoutDefaultSpace` using `Context.default()` | Changed to `this._ctx` for `space.open` and `initializeDataPipeline`.                                                                       |
| `RemoteTracing` ended spans losing OTEL context                                 | Added `_endedSpanContexts` map; `getSpanContext` falls back to ended contexts. Bounded to 10k entries.                                      |
| `RemoteTracing` pre-registration spans silently dropped                         | Added `_pendingFlushes` buffer; replayed in order when `registerProcessor` is called.                                                       |
| `AutomergeHost._open` not passing `ctx` to `CollectionSynchronizer.open/close`  | Now passes `ctx` to `open(ctx)` and `close(ctx)`.                                                                                           |
| `DataSpace._close` not passing `ctx` to `inner.close()`                         | Now passes `ctx` to `this._inner.close(ctx)`.                                                                                               |
| `Resource.#internalCtx` has no trace parent                                     | `#open()` now recreates `#internalCtx` with `parent: #parentCtx` for attribute lookup. Background work gets caller's span as parent.        |
| `CoreDatabase._ctx` has no trace parent                                         | `open(ctx)` now sets `this._ctx = new Context({ parent: ctx })`. `_emitDbUpdateEvents` gets caller's span as parent.                        |
| `EchoHost._open` not passing `ctx` to `AutomergeHost.open()`                    | Now passes `ctx` to `this._automergeHost.open(ctx)`.                                                                                        |
| `ControlPipeline._consumePipeline` infinite-loop span never exports             | Removed `@trace.span()`. `for await` loop runs indefinitely so OTEL never exports the span. `_processMessage` now child of `start` span.    |

---

## Files reviewed

- `packages/core/mesh/edge-client/src/edge-client.ts`
- `packages/core/mesh/edge-client/src/edge-http-client.ts`
- `packages/core/mesh/edge-client/src/edge-ws-connection.ts`
- `packages/core/mesh/messaging/src/signal-manager/edge-signal-manager.ts`
- `packages/core/mesh/messaging/src/signal-manager/memory-signal-manager.ts`
- `packages/core/mesh/messaging/src/signal-manager/websocket-signal-manager.ts`
- `packages/core/mesh/messaging/src/signal-client/signal-client.ts`
- `packages/core/mesh/messaging/src/messenger.ts`
- `packages/core/mesh/messaging/src/signal-methods.ts`
- `packages/core/mesh/network-manager/src/network-manager.ts`
- `packages/core/mesh/network-manager/src/signal/swarm-messenger.ts`
- `packages/core/mesh/network-manager/src/signal/signal-connection.ts`
- `packages/core/mesh/network-manager/src/signal/signal-messenger.ts`
- `packages/core/mesh/network-manager/src/swarm/swarm.ts`
- `packages/core/mesh/network-manager/src/swarm/peer.ts`
- `packages/core/mesh/network-manager/src/swarm/connection.ts`
- `packages/core/echo/echo-pipeline/src/automerge/automerge-host.ts`
- `packages/core/echo/echo-pipeline/src/automerge/echo-network-adapter.ts`
- `packages/core/echo/echo-pipeline/src/automerge/echo-replicator.ts`
- `packages/core/echo/echo-pipeline/src/automerge/collection-synchronizer.ts`
- `packages/core/echo/echo-pipeline/src/db-host/echo-host.ts`
- `packages/core/echo/echo-pipeline/src/db-host/data-service.ts`
- `packages/core/echo/echo-pipeline/src/db-host/documents-synchronizer.ts`
- `packages/core/echo/echo-pipeline/src/db-host/query-service.ts`
- `packages/core/echo/echo-pipeline/src/db-host/automerge-data-source.ts`
- `packages/core/echo/echo-pipeline/src/space/space-protocol.ts`
- `packages/core/echo/echo-pipeline/src/space/control-pipeline.ts`
- `packages/core/echo/echo-pipeline/src/space/space.ts`
- `packages/core/echo/echo-pipeline/src/edge/echo-edge-replicator.ts`
- `packages/core/echo/echo-pipeline/src/query/query-executor.ts`
- `packages/core/echo/echo-db/src/core-db/core-database.ts`
- `packages/core/echo/echo-db/src/queue/queue-query-context.ts`
- `packages/core/echo/echo-db/src/client/index-query-source-provider.ts`
- `packages/core/echo/echo-db/src/query/graph-query-context.ts`
- `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts`
- `packages/sdk/client-services/src/packlets/spaces/data-space.ts`
- `packages/sdk/client-services/src/packlets/identity/identity.ts`
- `packages/sdk/client-services/src/packlets/identity/identity-manager.ts`
- `packages/sdk/client-services/src/packlets/identity/identity-service.ts`
- `packages/sdk/client-services/src/packlets/services/service-context.ts`
- `packages/sdk/client-services/src/packlets/services/service-host.ts`
- `packages/sdk/client-services/src/packlets/invitations/invitations-manager.ts`
- `packages/sdk/client-services/src/packlets/spaces/notarization-plugin.ts`
- `packages/sdk/client/src/echo/space-proxy.ts`
- `packages/sdk/client/src/echo/space-list.ts`
- `packages/sdk/client/src/client/client.ts`
- `packages/sdk/client/src/client/client-runtime.ts`
- `packages/sdk/observability/src/extensions/otel/traces-browser.ts`
- `packages/sdk/observability/src/extensions/otel/extension.ts`
- `packages/common/tracing/src/remote/tracing.ts`
- `packages/common/tracing/src/api.ts`
- `packages/common/tracing/src/trace-processor.ts`
- `packages/common/context/src/context.ts`
- `packages/common/context/src/resource.ts`
