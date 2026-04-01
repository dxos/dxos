# Context Propagation Audit

Audit of `ctx: Context` propagation compliance for distributed tracing (DX-868 / DX-765).
Rules: [SKILL.md](./SKILL.md). Out of scope: RPC client-service boundary.

---

## Summary

The PR wires `ctx: Context` through most of the networking and space lifecycle stack. The OTEL bridge maps DXOS span IDs to OpenTelemetry contexts and propagates `traceparent` in both WebSocket messages and HTTP requests. Browser auto-instrumentation (fetch, XHR, document-load) is disabled — all trace propagation is explicit via `ctx`.

Three remaining items require interface-level changes and are deferred.

---

## Remaining — requires interface changes

| Location                      | Method                | Issue                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `automerge-data-source.ts:98` | `getChangedObjects()` | Uses `Context.default()` for `loadDoc` inside Effect pipeline. `AutomergeDataSource` does not extend `Resource` and the `IndexDataSource` interface has no `Context` parameter. Requires adding `ctx` to the `IndexDataSource` interface. |
| `echo-edge-replicator.ts:78`  | `connect()`           | Assigns `Context.default()` as lifecycle context for the connection. `AutomergeReplicatorContext` interface does not carry `@dxos/context` `Context`. Legitimate lifecycle context creation — low priority.                               |
| `queue-query-context.ts:59`   | `start()`             | Creates `Context.default()` as a run-scoped context. `start()` takes no arguments; caller `QueryResultImpl._start()` has no `ctx`. Legitimate run-scoped lifecycle context — low priority.                                                |

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
- **SwarmMessenger** → `signal`, `offer` forward `ctx` on the outbound path; `receiveMessage` forwards `ctx` to `_handleOffer` for sending answers. Inbound callbacks (`onOffer`, `onSignal`) do not receive `ctx` since the inbound chain has no `@trace.span()` or network call.
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
- **IdentityManager.createIdentity/prepareIdentity** → accept optional `ctx`, forward to `identity.open(ctx)`.
- **AutomergeHost.waitUntilHeadsReplicated(ctx)** → forwards `ctx` to `loadDoc(ctx)`.
- **QueryExecutor.\_loadFromAutomerge/\_loadFromDXN** → use `this._ctx` (Resource lifecycle) for `loadDoc`.
- **DocumentsSynchronizer.addDocuments** → uses `this._ctx` (Resource lifecycle) for `loadDoc`.
- **IdentityServiceImpl.\_createDefaultSpace(ctx)** → forwards `ctx` to `createDefaultSpace(ctx)`.
- **IdentityServiceImpl.\_fixIdentityWithoutDefaultSpace** → uses `this._ctx` for `space.open` and `initializeDataPipeline`.
- **DataSpaceManager.\_getSpaceRootDocument(ctx)** → forwards `ctx` to `loadDoc(ctx)`.
- **DataSpaceManager trace.diagnostic callback** → uses `this._ctx` for `loadDoc`.

---

## OTEL bridge edge cases

1. **Parent span already ended.** If a parent `TracingSpan` has ended and been removed from `_idToSpan` before its child starts, `parentContext` is `undefined`. The child becomes an orphaned root in OTEL even though the DXOS span tree has the correct `parentId`.

2. **`markError` + `markSuccess` double flush.** On error, `catch` calls `markError` and `finally` calls `markSuccess`. Both set `endTs` and trigger `_flushSpan`. Second flush is a no-op on the remote side but causes redundant serialization.

3. **`sanitizeClassName` over-truncation.** Strips trailing digits: `Peer2` → `Peer`. Cosmetic issue for span names.

---

## Resolved in this PR

| Item                                                                            | Resolution                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EdgeHttpClient._call` missing trace headers                                    | Added `getTraceHeaders(ctx)` — injects `traceparent`/`tracestate` into fetch requests.                                                                                                                                                                  |
| `StackContextManager` async limitation                                          | Removed. DXOS relies on explicit `ctx` passing, not OTEL `ContextManager`.                                                                                                                                                                              |
| Fetch/XHR/document-load auto-instrumentation                                    | Disabled — all three produce orphaned root spans without a context manager.                                                                                                                                                                             |
| `ServiceContext._acceptIdentity` using `new Context()`                          | Changed to `this._ctx`.                                                                                                                                                                                                                                 |
| `EchoHost.openSpaceRoot` / `createSpaceRoot` missing `ctx`                      | Added `ctx` as first parameter; all callers updated.                                                                                                                                                                                                    |
| `DataSpace._onNewAutomergeRoot` using `Context.default()` for `loadDoc`         | Changed to `this._ctx`.                                                                                                                                                                                                                                 |
| `devices-service.test.ts` passing `Context.default()` to `createIdentity`       | Fixed — `createIdentity` takes `CreateIdentityOptions`, not `Context`.                                                                                                                                                                                  |
| `SpaceList._open/_close` missing `ctx`                                          | Added `ctx: Context` first parameter; threaded through `ClientRuntime`.                                                                                                                                                                                 |
| `ServiceHost.close()` missing `ctx`                                             | Added `ctx: Context` first parameter; all callers updated.                                                                                                                                                                                              |
| `ControlPipeline.start` passing `this._ctx` to `_consumePipeline`               | Changed to pass caller's `ctx`.                                                                                                                                                                                                                         |
| `Swarm.onOffer` / `onSignal` inbound path excessive propagation                 | Reverted — inbound signal chain (`SwarmMessenger` callbacks → `Swarm.onOffer/onSignal` → `Peer.onOffer/onSignal` → `Connection.signal`) does not reach any `@trace.span()` or outbound network call. `ctx` removed from callbacks and receiver methods. |
| `AutomergeHost.addReplicator/removeReplicator` excessive propagation            | Reverted — `ctx` was unused (no `@trace.span()`, not forwarded). Removed `ctx` parameter from both methods and their callers in `EchoHost`.                                                                                                             |
| `IdentityManager.createIdentity/prepareIdentity` using `new Context()`          | Added optional `ctx` parameter; callers pass `ctx` when available.                                                                                                                                                                                      |
| `DataSpaceManager._getSpaceRootDocument` using `Context.default()`              | Added `ctx` parameter; `createDefaultSpace(ctx)` passes it through.                                                                                                                                                                                     |
| `DataSpaceManager` trace.diagnostic `loadDoc(Context.default())`                | Changed to `this._ctx`.                                                                                                                                                                                                                                 |
| `DocumentsSynchronizer.addDocuments` using `Context.default()`                  | Changed to `this._ctx` (Resource lifecycle).                                                                                                                                                                                                            |
| `AutomergeHost.waitUntilHeadsReplicated` using `Context.default()`              | Added `ctx` parameter; RPC handler passes `Context.default()`.                                                                                                                                                                                          |
| `QueryExecutor._loadFromAutomerge/_loadFromDXN` using `Context.default()`       | Changed to `this._ctx` (Resource lifecycle).                                                                                                                                                                                                            |
| `IdentityServiceImpl._createDefaultSpace` using `Context.default()`             | Added `ctx` parameter; callers pass `this._ctx`.                                                                                                                                                                                                        |
| `IdentityServiceImpl._fixIdentityWithoutDefaultSpace` using `Context.default()` | Changed to `this._ctx` for `space.open` and `initializeDataPipeline`.                                                                                                                                                                                   |

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
