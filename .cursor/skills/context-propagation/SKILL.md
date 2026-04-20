---
name: context-propagation
description: >-
  Rules for passing ctx: Context as the first parameter to internal methods
  so that @trace.span() produces connected trace hierarchies. Use when adding
  context propagation, reviewing ctx usage, fixing broken traces, or when
  code uses @trace.span(), Context, or this._ctx.
---

# Context Propagation — Rules for Connected Traces

Every internal method takes `ctx: Context` as its first parameter (Go-style). The `@trace.span()` decorator detects `ctx` as `args[0]`, uses it as the parent span, and replaces it with a child context before calling the method body. This enables hierarchical OTEL traces without Zone.js.

For how the tracing system works internally (`TracingBackend`, `RemoteSpan`, `TRACE_PROCESSOR`, all APIs), see the [tracing](../tracing/SKILL.md) skill.

```typescript
import { Context } from '@dxos/context';
```

## Why This Matters

The `@trace.span()` decorator reads a parent span from the incoming `ctx` attribute (`TRACE_SPAN_ATTRIBUTE`). If `ctx` has no parent span (e.g., from `Context.default()`), the decorator creates an **orphaned root span** — disconnected from the trace hierarchy. Every method between an entry point and a `@trace.span()` method must accept and forward `ctx`, even if the intermediate method itself has no `@trace.span()`.

## Which Methods Need ctx

**`ctx: Context` is always the first parameter.** Not in an options bag, not as the last parameter, not optional.

Add `ctx: Context` as first parameter to methods on any call chain that reaches:

- **`EdgeHttpClient` methods** — all HTTP calls to EDGE services.
- **`EdgeWsConnection.send` / `EdgeClient.send`** — all WebSocket messages to EDGE.
- **Swarm / WebRTC connections** (mesh replication, peer discovery).
- **Feed replication** (Hypercore feed read/write over the network).
- **Credential notarization** (writes that hit the control pipeline and propagate to peers).

Every method in the call chain — from entry point through signal managers, messengers, replicators, down to the terminal networking call — must accept `ctx: Context` as its first parameter and forward it.

Do **not** add ctx to:

- **Public user-facing APIs** — these create `ctx = Context.default()` internally and forward it.
- **RPC service methods** (proto-generated interface) — the signature is fixed by the proto definition; you cannot add `ctx` as a parameter. Instead, read `options.ctx` which is provided by `RpcPeer` via `ContextRpcCodec` with the caller's trace context already decoded. Forward `options.ctx` (or `options?.ctx ?? Context.default()`) to internal methods.
- **React components and hooks** — UI code should not propagate ctx; create `Context.default()` at the boundary.
- **Infrastructure / plumbing** — worker setup, service registry wiring, serialization.
- **Pure local operations** — in-memory data transforms, UI state, local database reads.
- **Leaf utility methods** — small methods that don't call other methods (getters, simple lookups, validation helpers).
- **Test utilities** — test builders, test helpers (unless they call production code that requires ctx, in which case pass `Context.default()`).

### Key entry points

| Class / layer                            | Role                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ClientServicesHost` (`service-host.ts`) | Top-level root — `initialize(ctx)`, `close(ctx)` propagate to everything below.                  |
| `DataSpaceManager`                       | Manages space lifecycle — `createSpace`, `acceptSpace`, `close` are networking paths.            |
| `DataSpace`                              | Per-space networking — control pipeline, data pipeline, epoch creation, feed replication.        |
| `IdentityManager`                        | Identity HALO operations — `createIdentity`, `updateProfile` write credentials over the network. |
| `EchoHost` / `CoreDatabase`              | Database sync layer — document loading, flushing, index updates flow to Automerge replication.   |
| `SpaceProtocol` / mesh layer             | Swarm connections, signaling, WebRTC — `open`, `close`, `updateTopology`.                        |

## Rules

### 1. Direct calls: forward the caller's ctx

Any sync or async call inside a method should receive the method's `ctx`.

```typescript
@trace.span()
async open(ctx: Context): Promise<void> {
  await this._initPipeline(ctx);
  await this._loadData(ctx);
}
```

For **public user-facing methods**, create a root context and forward it:

```typescript
async createSpace(options: CreateSpaceOptions = {}): Promise<Space> {
  const ctx = Context.default();
  return this._createSpaceInternal(ctx, options);
}
```

For **RPC service methods**, use `options.ctx` which carries the caller's trace context propagated across the wire by `ContextRpcCodec`:

```typescript
testCall: async (req: TestRequest, options?: RequestOptions) => {
  const ctx = options?.ctx ?? Context.default();
  return this._handleTestCall(ctx, req);
},
```

### 2. Event subscriptions and callbacks: use lifecycle ctx

Callbacks are new entry points without a caller-provided ctx. Use `this._ctx` from `Resource` or a manually managed `Context`.

```typescript
this._spaceStateMachine.onFeedAdmitted.set(async (info) => {
  await this._handleFeedAdmitted(this._ctx, info);
});

this.stateUpdate.on(this._ctx, () => {
  this._refresh(this._ctx);
});
```

Lifecycle ctx is correct because it is scoped to the object's lifetime. When the class uses `@trace.resource({ lifecycle: true })`, `this._ctx` carries the lifecycle span's trace context, so callbacks appear as children of the lifecycle span rather than orphaned roots or stale children of the `_open` span.

### 3. Detached async work: use class lifecycle ctx

`setTimeout`, `scheduleTask`, `DeferredTask`, `scheduleMicroTask`, `queueMicrotask` run outside the caller's call stack. Use `this._ctx`.

```typescript
this._updateTask = new DeferredTask(this._ctx, () => this._executeQueries(this._ctx));

scheduleMicroTask(this._ctx, async () => {
  await this._handleFeedAdmission(this._ctx, info);
});
```

Never use `Context.default()` for detached work — it creates an orphaned context nobody disposes.

### 4. Parallel fan-out: share the parent ctx

Pass the same `ctx` to each branch. The `@trace.span()` decorator derives independent child contexts.

```typescript
@trace.span()
async initializeAll(ctx: Context): Promise<void> {
  await Promise.all([
    this._initA(ctx),
    this._initB(ctx),
    this._initC(ctx),
  ]);
}
```

### 5. Reassign `ctx` to the return value of `trace.spanStart()`

The manual span API `trace.spanStart()` returns a **derived `Context`** carrying the new span on `TRACE_SPAN_ATTRIBUTE`. Callers MUST reassign the local `ctx` to the returned value so that downstream `@trace.span()` methods see this span as their parent.

```typescript
// ✅ CORRECT — ctx reassigned, downstream @trace.span methods nest under the manual span.
ctx = trace.spanStart({
  id: spanId,
  instance: this,
  methodName: 'acceptInvitation',
  parentCtx: ctx,
  op: 'invitation.guest',
}) ?? ctx;
ctx.onDispose(() => trace.spanEnd(spanId));
await this._handleGuestFlow(ctx, ...); // inherits the manual span as parent
```

```typescript
// ❌ WRONG — return value ignored; downstream spans don't see this one.
trace.spanStart({ id: spanId, instance: this, methodName: 'acceptInvitation', parentCtx: ctx, ... });
ctx.onDispose(() => trace.spanEnd(spanId));
await this._handleGuestFlow(ctx, ...); // ctx unchanged → handleGuestFlow's @trace.span becomes a new root
```

When `parentCtx` is not `null` and the span is actually created, the returned ctx is a `parentCtx.derive({ attributes: { [TRACE_SPAN_ATTRIBUTE]: newSpanContext } })`. Disposing the original `parentCtx` still cascades to the derived one, so the `onDispose(spanEnd)` pattern remains correct.

### 6. Complete call chain: every method between entry point and @trace.span must forward ctx

**Critical rule**: every intermediate method between an entry point and a `@trace.span()` method must accept and forward `ctx`, even if the intermediate method itself has no `@trace.span()`. Otherwise the trace chain is broken.

```typescript
// ❌ WRONG — breaks trace chain with Context.default() at the last step
class SpaceList {
  private _setupSpacesStream(): void {
    stream.subscribe((data) => {
      scheduleMicroTask(this._ctx, async () => {
        await spaceProxy._processUpdate(data); // no ctx
      });
    });
  }
}

class SpaceProxy {
  async _processUpdate(data: Data): Promise<void> {
    // no ctx
    await this._initialize(); // no ctx
  }

  private async _initialize(): Promise<void> {
    // no ctx
    await this._initializeDb(Context.default()); // orphaned root!
  }

  @trace.span()
  private async _initializeDb(_ctx: Context): Promise<void> {
    // _ctx has no parent span — creates disconnected root span
  }
}
```

```typescript
// ✅ CORRECT — ctx flows through entire chain
class SpaceList {
  private _setupSpacesStream(): void {
    stream.subscribe((data) => {
      scheduleMicroTask(this._ctx, async () => {
        await spaceProxy._processUpdate(this._ctx, data); // lifecycle ctx
      });
    });
  }
}

class SpaceProxy {
  async _processUpdate(ctx: Context, data: Data): Promise<void> {
    await this._initialize(ctx); // forwards ctx
  }

  private async _initialize(ctx: Context): Promise<void> {
    await this._initializeDb(ctx); // forwards ctx
  }

  @trace.span()
  private async _initializeDb(_ctx: Context): Promise<void> {
    // _ctx has parent span from lifecycle context — connected hierarchy
  }
}
```

## How Context Flows

```text
User code (no ctx)
  → public API creates ctx = Context.default()
    → intermediate method forwards ctx (no @trace.span — passes as-is)
      → @trace.span() method receives ctx
        decorator: reads parent span, creates child span, replaces ctx
        → method body receives child ctx
          → next method forwards child ctx
            → @trace.span() method — creates grandchild span
              → ...

RPC boundary:
  caller's @trace.span() sets TRACE_SPAN_ATTRIBUTE on ctx
    → RpcPeer.call: ContextRpcCodec.encode(ctx) → W3C traceparent on wire
      ──── network ────
    → RpcPeer handler: ContextRpcCodec.decode(data) → options.ctx with parent span
      → service method reads options.ctx → forwards to internal methods
        → @trace.span() method — child of the remote caller's span

Callback / detached async work:
  event fires → callback uses this._ctx (lifecycle context)
    → intermediate method forwards this._ctx
      → @trace.span() method — creates root span tied to object lifecycle
```

## Who Provides the Root Context

| Situation                            | Root ctx                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Public API entry point               | `Context.default()`                                                                                                       |
| RPC service method (proto-generated) | `options.ctx` (decoded from caller's W3C trace context by `ContextRpcCodec`; falls back to `Context.default()` if absent) |
| Callback / event handler             | `this._ctx` (lifecycle)                                                                                                   |
| Detached async work                  | `this._ctx` (lifecycle)                                                                                                   |

## Quick Reference

| Situation                                | What ctx to use                     |
| ---------------------------------------- | ----------------------------------- |
| Direct call inside a method              | Forward the method's `ctx`          |
| Public API entry point                   | `Context.default()`                 |
| RPC service method (proto-generated)     | `options.ctx` (from RPC)            |
| Event / callback subscription            | Lifecycle `this._ctx`               |
| setTimeout / scheduleTask / DeferredTask | Lifecycle `this._ctx`               |
| queueMicrotask                           | Lifecycle `this._ctx`               |
| Promise.all fan-out                      | Same `ctx` for all branches         |
| No caller ctx available                  | Lifecycle `this._ctx`               |
| After `trace.spanStart()`                | `ctx = trace.spanStart(...) ?? ctx` |

## No Orphaned Internal Spans

**Every `@trace.span()` method that runs inside a service or resource MUST have a parent span.** An orphaned root span (one with no `parentSpanID`) means the trace context chain is broken — the span is disconnected from the trace tree and provides no useful correlation.

Allowed root spans (no parent):

- **Public API entry points** — `Client.initialize()`, `HaloProxy.createIdentity()`, `SpaceList.create()` — these are user-initiated actions that start a new trace.
- **Stream/subscription callbacks** using `this._ctx` from a `@trace.resource({ lifecycle: true })` class — the lifecycle span IS the root, and the callback span is its child.

Disallowed orphaned spans:

- Any `@trace.span()` method inside a `Resource` subclass that has no parent. Fix: add `lifecycle: true` to the class's `@trace.resource()` so `this._ctx` carries the lifecycle span's trace context.
- Any `@trace.span()` method called from an RPC handler that ignores `options.ctx`. Fix: read `options?.ctx ?? Context.default()` and forward it.
- Any intermediate method that creates `Context.default()` instead of forwarding the caller's `ctx`.

When adding a new `@trace.span()` to an internal method, verify that at least one of these is true:

1. The method accepts `ctx: Context` as its first parameter and the caller forwards a traced context.
2. The method runs inside a `@trace.resource({ lifecycle: true })` class and uses `this._ctx` (which carries the lifecycle span).
3. The method is an RPC handler that reads `options.ctx`.

If none of these hold, the span will be orphaned. Either fix the call chain or don't add `@trace.span()`.

## Common Mistakes

- **Breaking the chain with `Context.default()` in an intermediate method** — if a method calls `child(Context.default())` where `child` has `@trace.span()`, the span is an orphaned root. The intermediate method must accept `ctx` from its caller and forward it.
- **Passing `this._ctx` in a direct call** when the method has `ctx` in scope — breaks trace hierarchy, creates a new root instead of a child span.
- **Passing `ctx` in a callback or `scheduleTask`** — captures a stale context whose span has already ended. However, `this._ctx` from lifecycle contexts still works as a parent because `TRACE_SPAN_ATTRIBUTE` stores W3C strings that remain valid after the span ends.
- **Ignoring the return value of `trace.spanStart()`** — `spanStart` returns a derived ctx carrying the new span. Downstream `@trace.span` methods called with the unchanged `ctx` will see the span's parent, not the span itself, and start a new root trace. Reassign `ctx = trace.spanStart(...) ?? ctx;` before forwarding.
- **Adding `ctx` to Node.js protocol methods** (e.g., `[Symbol.for('nodejs.util.inspect.custom')]`) — fixed-signature methods that don't support extra parameters.
- **Adding `ctx` to public APIs** — user-facing methods should not expose `Context`; create `Context.default()` internally.
- **Ignoring `options.ctx` in RPC service methods** — `RpcPeer` provides `options.ctx` with the caller's trace context decoded from W3C headers. Use `options?.ctx ?? Context.default()`, not `this._ctx` or a bare `Context.default()`. Using `this._ctx` breaks the cross-process trace hierarchy; using `Context.default()` discards the propagated trace.

## ESLint Enforcement

The `dxos-plugin/require-context-param` rule warns on class methods missing `ctx: Context` as the first parameter. Configured in `eslint.config.mjs` for core SDK packages with exemptions for public API classes.

## Audit

See [AUDIT.md](./AUDIT.md) for a detailed review of context propagation compliance across the codebase, including known gaps and prioritized recommendations.
