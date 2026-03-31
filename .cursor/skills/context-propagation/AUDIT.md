# Context Propagation Audit — PR #10696

Audit of `ctx: Context` propagation compliance for distributed tracing (DX-868 / DX-765).
Scope: all traced call chains must pass `ctx` correctly per [SKILL.md](./SKILL.md).
Out of scope: RPC client-service boundary context propagation.

## Overall assessment

The PR successfully wires `ctx: Context` through the majority of the networking stack — signal managers, messengers, swarm layer, edge replicator, echo pipeline, data-space lifecycle, and identity. The OTEL bridge (`RemoteTracing` ↔ `traces-browser.ts`) correctly maps DXOS span IDs to OpenTelemetry contexts and propagates `traceparent` in WebSocket messages.

Context propagation relies entirely on explicit `ctx: Context` parameter passing. The `StackContextManager` has been removed — OTEL auto-instrumentation (e.g. fetch) produces orphaned root spans and should not be relied on for parent-child relationships or header injection into EDGE requests.

There are several categories of issues below, ranging from **fetch instrumentation conflicts** to **specific violations** of the context propagation rules.

---

## Critical findings

### 1. `EdgeHttpClient._call` does not inject trace context into HTTP requests

**Location:** `packages/core/mesh/edge-client/src/edge-http-client.ts`

`_call(ctx, url, args)` receives `ctx` but only uses it for **retry/disposal** (`shouldRetry(ctx, ...)`). The actual `fetch()` call does not inject `traceparent`/`tracestate` headers from the OTEL context on `ctx`.

WebSocket messages (`EdgeClient.send`) do inject `message.traceContext` from ctx → OTEL context. HTTP requests do not get the same treatment. This means **all EdgeHttpClient calls** (notarization, queue operations, function invocations, bundle import/export, exec-query) produce **orphaned traces** on the EDGE side.

**Fix:** In `_call`, extract the OTEL context from `ctx` (same pattern as `EdgeClient.send`) and inject `traceparent`/`tracestate` as HTTP headers on the `fetch` request.

### 2. Fetch auto-instrumentation does not produce correctly parented spans

**Location:** `packages/sdk/observability/src/extensions/otel/traces-browser.ts`

DXOS relies on explicit `ctx: Context` parameter passing, not on OTEL's `ContextManager` (the `StackContextManager` has been removed). Without a context manager, `otelContext.active()` always returns `ROOT_CONTEXT`. This means:

- **Fetch auto-instrumentation creates fetch spans** — visible in SigNoz.
- **Those spans are always orphaned root spans** — `otelContext.active()` has no parent.
- **Auto-injected `traceparent` headers carry a new root trace ID** — disconnected from the DXOS client-side trace tree.

Additionally, if `EdgeHttpClient._call` manually injects `traceparent` from the DXOS `ctx` and fetch auto-instrumentation is also active for the same URL, the auto-instrumentation may **overwrite** the manually injected `traceparent` with its own orphaned one.

**Action required:**
1. Add EDGE HTTP URLs to the `ignoreUrls` list in the fetch instrumentation config, so auto-instrumentation does not intercept EDGE calls.
2. Manually inject `traceparent`/`tracestate` in `EdgeHttpClient._call` from the DXOS `ctx` (same pattern as `EdgeClient.send`).

Fetch auto-instrumentation remains useful for non-EDGE HTTP calls (third-party APIs, etc.) where visibility alone is sufficient and parentage is not critical.

### 3. `ServiceContext._acceptIdentity` uses `new Context()` instead of `this._ctx`

**Location:** `packages/sdk/client-services/src/packlets/services/service-context.ts:358`

```typescript
await this._initialize(new Context());
```

`new Context()` creates a bare context with no dispose wiring and no parent span. This should be `this._ctx` (lifecycle context) since `_acceptIdentity` is called from a callback/event path.

---

## `Context.default()` usage in intermediate methods

Per the skill rules, `Context.default()` should only appear at **public API entry points** and **RPC service methods**. Several intermediate methods use `Context.default()` where the caller has (or should have) a ctx in scope:

| Location | Code | Issue |
|----------|------|-------|
| `EchoHost.openSpaceRoot` | `loadDoc(Context.default(), ...)` | Called from `DataSpaceManager.createSpace(ctx)` — should forward `ctx`. |
| `DataSpace._onNewAutomergeRoot` | `loadDoc(Context.default(), ...)` | Callback path — should use `this._ctx`. |
| `DocumentsSynchronizer.addDocuments` | `loadDoc(Context.default(), ...)` | Called during space lifecycle — should use the synchronizer's lifecycle ctx. |

---

## `ctx` accepted but unused

These methods accept `ctx` for API consistency but do not use it internally. While not breaking, they create a false sense of propagation:

| Method | Location | Notes |
|--------|----------|-------|
| `AutomergeHost.flush(ctx)` | `echo-pipeline/automerge-host.ts` | Body does `this._repo.flush(...)` with no ctx. |
| `AutomergeHost.addReplicator(ctx)` | `echo-pipeline/automerge-host.ts` | Calls `_echoNetworkAdapter.addReplicator(replicator)` — no ctx. |
| `AutomergeHost.removeReplicator(ctx)` | `echo-pipeline/automerge-host.ts` | Same. |
| `Connection.signal(_ctx)` | `network-manager/swarm/connection.ts` | Inbound signal handler; `_ctx` is unused in the body. |
| `SignalClient.join/_ctx`, `leave/_ctx`, `sendMessage/_ctx` | `messaging/signal-client.ts` | `_ctx` accepted but not forwarded to RPC send or local state. |
| `InvitationsManager.acceptInvitation(_ctx)` | `client-services/invitations-manager.ts` | Caller ctx is unused; creates fresh `new Context(...)` internally. |

These are **low priority** — they ensure the API is ready for future propagation. But `flush` is on a hot path and should eventually propagate ctx for cancellation.

---

## `this._ctx` vs caller `ctx` conflicts

Per the skill rules: use caller's `ctx` in direct calls, use `this._ctx` only in callbacks/detached work.

| Location | Issue |
|----------|-------|
| `DataSpace._createWritableFeeds` | Uses `notarize({ ctx: this._ctx })` inside `initializeDataPipeline(ctx)` call chain. Should forward `ctx`. |
| `DataSpace._close(_ctx)` | Parameter `_ctx` is unused; calls `this._ctx.dispose()` directly. Minor: rename param to `_` or remove. |
| `ServiceContext._acceptIdentity` | Uses `identity.joinNetwork(this._ctx)` — correct (callback path). But then `_initialize(new Context())` — should be `this._ctx`. |
| `EdgeSignalManager.query(ctx)` | `cancelWithContext(this._ctx, ...)` for the await, but `send(ctx, ...)` for the outbound message. Mixed: the cancellation should probably also respect `ctx`. |
| `Swarm` listen path | `receiveMessage(this._ctx, message)` — correct (callback, no caller ctx). |

---

## Correctly implemented patterns

These areas are properly wired:

- **EdgeClient.send(ctx)** → extracts OTEL span → injects `message.traceContext` with `traceparent`/`tracestate`.
- **EdgeSignalManager** → all four methods (`join`, `leave`, `query`, `sendMessage`) forward `ctx` to `this._edgeConnection.send(ctx, ...)`.
- **Messenger.sendMessage(ctx)** → `_encodeAndSend(ctx)` → `signalManager.sendMessage(ctx)`.
- **SwarmMessenger** → all methods (`signal`, `offer`, `receiveMessage`) forward `ctx` through callbacks and `_sendReliableMessage`.
- **NetworkManager.joinSwarm(ctx)** → `signalConnection.join(ctx)` → `signalManager.join(ctx)`.
- **AutomergeHost bundle path** → `_handleCollectionSync(ctx)` → `_pushInBundles(ctx)` → `_pushBundle(ctx)` → `echoNetworkAdapter.pushBundle(ctx)` → `replicatorConnection.pushBundle(ctx)` → `EdgeHttpClient.importBundle(ctx)`.
- **EchoEdgeReplicator.connectToSpace(ctx)** — has `@trace.span()` and forwards ctx.
- **DataSpaceManager.createSpace(ctx)** → `_constructSpace(ctx)` → `space.open(ctx)` → `initializeDataPipeline(ctx)`.
- **DataSpaceManager.acceptSpace(ctx)** → `_constructSpace(ctx)` → `space.open(ctx)`.
- **Identity.open(ctx)**, `close(ctx)`, `joinNetwork(ctx)` — all forward to `space.open/close/startProtocol(ctx)`.
- **ControlPipeline.start(ctx)** — `@trace.span()` with proper ctx.
- **SpaceProtocol.start(ctx)** → `networkManager.joinSwarm(ctx)`.
- **RemoteTracing** → correctly maps DXOS span IDs ↔ OTEL contexts, passes `parentContext`, provides `wrapExecution` and `spanContext`.
- **@trace.span() decorator** → correctly extracts ctx from `args[0]`, derives child ctx, wraps execution in OTEL active context.
- **TracingSpan** → always derives a child context (even without parentCtx), ctx getter never returns null.
- **W3C trace context propagation** registered in browser OTEL setup.
- **TraceContext proto** added to `Message` for WS-level distributed tracing.

---

## Edge cases in OTEL bridge

1. **Parent span already ended:** If a parent `TracingSpan` has ended and been removed from `_idToSpan` before its child starts, `parentContext` will be `undefined`. The child span becomes an orphaned root in OTEL even though the DXOS span tree has the correct `parentId`.

2. **`markError` + `markSuccess` double flush:** On error, `catch` calls `markError` and `finally` calls `markSuccess`. Both set `endTs` and trigger `_flushSpan`. The second flush is a no-op on the remote side (span already removed from `_spanMap`) but causes redundant serialization work.

3. **`sanitizeClassName` strips legitimate trailing digits:** e.g., `Peer2` → `Peer`. Cosmetic issue for span names.

---

## Recommendations for follow-up

1. **P0: Inject trace headers in `EdgeHttpClient._call` `fetch` requests.** This is the biggest gap — all HTTP-based EDGE interactions have no trace propagation. Also add EDGE URLs to the fetch auto-instrumentation `ignoreUrls` to prevent the auto-instrumentation from overwriting manually injected headers.

2. ~~**P1: Fix `ServiceContext._acceptIdentity` to use `this._ctx` instead of `new Context()`.**~~ **RESOLVED** — Changed to `this._ctx`.

3. ~~**P1: Forward `ctx` to `EchoHost.openSpaceRoot` `loadDoc` call** instead of `Context.default()`.~~ **RESOLVED** — Added `ctx` parameter to `openSpaceRoot` and `createSpaceRoot`; all callers updated. Also fixed `DataSpace._onNewAutomergeRoot` to pass `this._ctx` instead of `Context.default()` to `loadDoc`.

4. **P2: Evaluate `AutomergeHost.flush(ctx)` — either use ctx for cancellation or remove the parameter** to avoid confusion.

5. **P3: Clean up unused `_ctx` parameters** (`Connection.signal`, `SignalClient.join/leave/sendMessage`) — either wire them or rename to `_` to signal intentional non-use.

---

## Appendix: Files reviewed

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
- `packages/core/echo/echo-pipeline/src/db-host/echo-host.ts`
- `packages/core/echo/echo-pipeline/src/db-host/data-service.ts`
- `packages/core/echo/echo-pipeline/src/db-host/documents-synchronizer.ts`
- `packages/core/echo/echo-db/src/core-db/core-database.ts`
- `packages/core/echo/echo-pipeline/src/space/space-protocol.ts`
- `packages/core/echo/echo-pipeline/src/space/control-pipeline.ts`
- `packages/core/echo/echo-pipeline/src/space/space.ts`
- `packages/core/echo/echo-pipeline/src/edge/echo-edge-replicator.ts`
- `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts`
- `packages/sdk/client-services/src/packlets/spaces/data-space.ts`
- `packages/sdk/client-services/src/packlets/identity/identity.ts`
- `packages/sdk/client-services/src/packlets/identity/identity-manager.ts`
- `packages/sdk/client-services/src/packlets/services/service-context.ts`
- `packages/sdk/client-services/src/packlets/invitations/invitations-manager.ts`
- `packages/sdk/client-services/src/packlets/spaces/notarization-plugin.ts`
- `packages/common/tracing/src/remote/tracing.ts`
- `packages/common/tracing/src/api.ts`
- `packages/common/tracing/src/trace-processor.ts`
- `packages/common/context/src/context.ts`
- `packages/sdk/observability/src/extensions/otel/traces-browser.ts`
- `packages/sdk/client/src/echo/space-proxy.ts`
- `packages/sdk/client/src/echo/space-list.ts`
