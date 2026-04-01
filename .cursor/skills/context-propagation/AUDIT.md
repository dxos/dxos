# Context Propagation Audit

Audit of `ctx: Context` propagation compliance for distributed tracing (DX-868 / DX-765).
Rules: [SKILL.md](./SKILL.md). Out of scope: RPC client-service boundary.

---

## Summary

The PR wires `ctx: Context` through most of the networking and space lifecycle stack. The OTEL bridge maps DXOS span IDs to OpenTelemetry contexts and propagates `traceparent` in both WebSocket messages and HTTP requests. Browser auto-instrumentation (fetch, XHR, document-load) is disabled — all trace propagation is explicit via `ctx`.

Remaining issues fall into four categories below, ordered by severity.

---

## P1 — Broken trace hierarchy

### 1. `SpaceList._open()` / `_close()` — `@trace.span()` without `ctx` parameter

**Location:** `packages/sdk/client/src/echo/space-list.ts:106, 281`

Both methods have `@trace.span()` but no `ctx: Context` first parameter. The decorator reads `args[0]` as `ctx` — without it, the span has no parent and becomes an orphaned root.

```typescript
@trace.span()
async _open(): Promise<void> { ... }  // VIOLATION

@trace.span()
async _close(): Promise<void> { ... } // VIOLATION
```

### 2. `ServiceHost.close()` — `@trace.span()` without `ctx` parameter

**Location:** `packages/sdk/client-services/src/packlets/services/service-host.ts:425`

`open(ctx)` correctly takes `ctx`. `close()` has `@Trace.span()` but no `ctx` — orphaned span.

```typescript
@Trace.span()
async close(): Promise<void> { ... } // VIOLATION — should be close(ctx: Context)
```

### 3. `ControlPipeline.start(ctx)` passes `this._ctx` instead of caller's `ctx` to `_consumePipeline`

**Location:** `packages/core/echo/echo-pipeline/src/space/control-pipeline.ts:132-133`

```typescript
setTimeout(async () => {
  void this._consumePipeline(this._ctx); // should be ctx
});
```

`_consumePipeline` is a direct downstream async path for processing the pipeline. Using `this._ctx` detaches it from the caller's trace tree. The `setTimeout` wrapper is fine (detached work), but the context should still be the caller's `ctx` for trace parentage.

### 4. `Swarm.onOffer(_ctx)` drops context — `Peer.onOffer` has no `ctx` parameter

**Location:** `packages/core/mesh/network-manager/src/swarm/swarm.ts:208`, `peer.ts`

`Swarm.onOffer(_ctx, message)` receives `ctx` from `SwarmMessenger` but calls `peer.onOffer(message)` without forwarding it. `Peer.onOffer` does not accept `ctx` at all, breaking the trace chain from inbound offer → peer → connection.

### 5. `IdentityManager.createIdentity` / `prepareIdentity` — `identity.open(new Context())`

**Location:** `packages/sdk/client-services/src/packlets/identity/identity-manager.ts:156, 259`

Both methods call `identity.open(new Context())`. The callers (`ServiceContext.createIdentity(ctx)`, `_acceptIdentity`) have `ctx` in scope. `new Context()` creates an orphaned root with no parent span.

---

## P2 — `Context.default()` in intermediate methods

Per rules, `Context.default()` belongs only at public API entry points and RPC service methods. These intermediate methods should receive `ctx` from their callers.

| Location | Method | Called from (has ctx) |
|----------|--------|----------------------|
| `data-space-manager.ts:410` | `_getSpaceRootDocument()` → `loadDoc(Context.default(), ...)` | `createDefaultSpace(ctx)` |
| `identity-service.ts:60` | `_createDefaultSpace()` → `Context.default()` | Called from `createIdentity` RPC |
| `identity-service.ts:156,163` | `_fixIdentityWithoutDefaultSpace()` → `Context.default()` | Called from `_open` lifecycle |
| `query-executor.ts:1265` | `_loadFromAutomerge()` → `Context.default()` | Internal query pipeline |
| `query-executor.ts:1332` | `_loadFromDXN()` → `Context.default()` | Internal query pipeline |
| `documents-synchronizer.ts:64` | `addDocuments()` → `loadDoc(Context.default(), ...)` | Pipeline lifecycle |
| `automerge-host.ts:402` | `waitUntilHeadsReplicated()` → `loadDoc(Context.default(), ...)` | Sync/replication path |
| `echo-edge-replicator.ts:78` | `connect()` → assigns `Context.default()` for lifecycle | Replicator setup |
| `queue-query-context.ts:59` | `start()` → `Context.default()` | Reactive query lifecycle |
| `automerge-data-source.ts:98` | `getChangedObjects()` → `Effect.gen` with `Context.default()` | Indexer pipeline |
| `data-space-manager.ts:188` | `trace.diagnostic` callback → `Context.default()` | Diagnostic fetch |

---

## P2 — `this._ctx` vs caller `ctx` conflicts

| Location | Issue |
|----------|-------|
| `SpaceProxy._initializeDb(_ctx)` | `cancelWithContext(this._ctx, ...)` for property wait. Cancellation of the current operation should use caller's `_ctx`, not the proxy's lifecycle context. |
| `DataSpace._createWritableFeeds` | `notarize({ ctx: this._ctx })` inside `initializeDataPipeline(ctx)` chain. Should forward `ctx`. |

---

## P3 — Unused `ctx` parameters (interface compliance)

These methods accept `ctx` / `_ctx` to satisfy interface contracts but don't use it in the body. No `@trace.span()` decorator either. Not a bug — documented for future wiring.

| Method | Interface |
|--------|-----------|
| `Connection.signal(_ctx)` | `SignalMessenger.signal(ctx, msg)` |
| `SignalClient.join/leave/sendMessage(_ctx)` | `SignalMethods` |
| `MemorySignalManager.join/leave/query/sendMessage(_ctx)` | `SignalMethods` |
| `AutomergeHost.addReplicator/removeReplicator(ctx)` | API consistency |
| Various `Resource._open/_close(ctx)` overrides | `Resource` lifecycle contract |

---

## Correctly implemented

These areas are properly wired:

- **EdgeClient.send(ctx)** → extracts OTEL span → injects `message.traceContext` with `traceparent`/`tracestate`.
- **EdgeHttpClient._call(ctx)** → `getTraceHeaders(ctx)` extracts OTEL context → injects `traceparent`/`tracestate` as HTTP headers on every `fetch` request.
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

---

## OTEL bridge edge cases

1. **Parent span already ended.** If a parent `TracingSpan` has ended and been removed from `_idToSpan` before its child starts, `parentContext` is `undefined`. The child becomes an orphaned root in OTEL even though the DXOS span tree has the correct `parentId`.

2. **`markError` + `markSuccess` double flush.** On error, `catch` calls `markError` and `finally` calls `markSuccess`. Both set `endTs` and trigger `_flushSpan`. Second flush is a no-op on the remote side but causes redundant serialization.

3. **`sanitizeClassName` over-truncation.** Strips trailing digits: `Peer2` → `Peer`. Cosmetic issue for span names.

---

## Resolved in this PR

| Item | Resolution |
|------|------------|
| `EdgeHttpClient._call` missing trace headers | Added `getTraceHeaders(ctx)` — injects `traceparent`/`tracestate` into fetch requests. |
| `StackContextManager` async limitation | Removed. DXOS relies on explicit `ctx` passing, not OTEL `ContextManager`. |
| Fetch/XHR/document-load auto-instrumentation | Disabled — all three produce orphaned root spans without a context manager. |
| `ServiceContext._acceptIdentity` using `new Context()` | Changed to `this._ctx`. |
| `EchoHost.openSpaceRoot` / `createSpaceRoot` missing `ctx` | Added `ctx` as first parameter; all callers updated. |
| `DataSpace._onNewAutomergeRoot` using `Context.default()` for `loadDoc` | Changed to `this._ctx`. |
| `devices-service.test.ts` passing `Context.default()` to `createIdentity` | Fixed — `createIdentity` takes `CreateIdentityOptions`, not `Context`. |

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
- `packages/sdk/observability/src/extensions/otel/traces-browser.ts`
- `packages/sdk/observability/src/extensions/otel/extension.ts`
- `packages/common/tracing/src/remote/tracing.ts`
- `packages/common/tracing/src/api.ts`
- `packages/common/tracing/src/trace-processor.ts`
- `packages/common/context/src/context.ts`
