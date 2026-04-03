---
name: context-propagation
description: >-
  Guides adding ctx: Context as the first parameter to internal methods for
  OTEL tracing. Use when adding context propagation, reviewing ctx usage,
  fixing tracing, or when code uses @trace.span(), Context, or this._ctx.
---

# Context Propagation

Every internal method takes `ctx: Context` as its first parameter (Go-style). The `@trace.span()` decorator detects `ctx` as `args[0]`, uses it as the parent span, and replaces it with a child context before calling the method body. This enables hierarchical OTEL traces without Zone.js.

```typescript
import { Context } from '@dxos/context';
```

## Which methods need ctx

**`ctx: Context` is always the first parameter.** This is a universal rule — not in an options bag, not as the last parameter, not optional. Every method that participates in context propagation takes `ctx: Context` as its very first parameter.

This rule applies to `EdgeHttpClient` methods, `EdgeWsConnection.send`, signal managers, messengers, replicators, and every intermediate method in between.

Add `ctx: Context` as first parameter to methods on any call chain that reaches:

- **`EdgeHttpClient` methods** — all HTTP calls to EDGE services (`notarizeCredentials`, `execQuery`, `importBundle`, `exportBundle`, etc.). `EdgeHttpClient` itself takes `ctx: Context` as the first parameter in every public method.
- **`EdgeWsConnection.send` / `EdgeClient.send`** — all WebSocket messages to EDGE (signaling, gossip, replication).
- **Swarm / WebRTC connections** (mesh replication, peer discovery).
- **Feed replication** (Hypercore feed read/write over the network).
- **Credential notarization** (writes that hit the control pipeline and propagate to peers).

Every method in the call chain — from entry point through signal managers, messengers, replicators, down to the terminal networking call — must accept `ctx: Context` as its first parameter and forward it.

Do **not** add ctx to:

- **Public user-facing APIs** (called by app/plugin developers) — these create `ctx = Context.default()` internally and forward it.
- **RPC service methods** (proto-generated interface) — the signature is fixed by the proto definition. Treat these as new entry points: create `ctx = Context.default()` and forward it to internal methods.
- **React components and hooks** — UI code should not propagate ctx; create `Context.default()` at the boundary if calling into SDK.
- **Infrastructure / plumbing** — worker setup, service registry wiring, serialization, import/export helpers.
- **Pure local operations** — in-memory data transforms, UI state, local database reads that never leave the process.
- **Leaf utility methods** — small methods that don't call other methods (getters, simple lookups, validation helpers). Adding ctx to these adds noise without tracing value.
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

Lifecycle ctx is correct because it is scoped to the object's lifetime and carries no trace span (callbacks are trace roots).

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

### 5. Complete call chain: every method between entry point and @trace.span must forward ctx

The `@trace.span()` decorator reads the parent span ID from incoming `ctx`. If `ctx` is `Context.default()` (no parent span), the decorator creates an **orphaned root span** — disconnected from the trace hierarchy.

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

Tracing who provides the root context:

- **Public API entry point**: creates `Context.default()` → passes to internal chain
- **RPC service method**: creates `Context.default()` → passes to internal chain (RPC boundaries are new entry points — the proto-generated interface does not accept `ctx`, so treat these the same as public API calls)
- **Callback / event handler**: uses `this._ctx` (lifecycle) → passes to internal chain
- **Detached async work**: uses `this._ctx` (lifecycle) → passes to internal chain

## How context flows

```text
User code (no ctx)
  → public API creates ctx = Context.default()
    → intermediate method forwards ctx (no @trace.span — passes as-is)
      → intermediate method forwards ctx (no @trace.span — passes as-is)
        → @trace.span() method receives ctx
          decorator: creates span, derives child ctx, replaces args[0]
          → method body receives child ctx
            → intermediate method forwards child ctx
              → @trace.span() method receives child ctx
                decorator: creates child span, derives grandchild ctx
                → ...

Callback / detached async work:
  event fires → callback uses this._ctx (lifecycle context)
    → intermediate method forwards this._ctx
      → @trace.span() method receives this._ctx — creates root span tied to object lifecycle
```

Each `@trace.span()` method reads the parent span ID from the incoming ctx, creates a new span, derives a child context with the new span ID, and replaces `args[0]`. Methods without `@trace.span()` forward ctx as-is.

## Quick reference

| Situation                                | What ctx to use             |
| ---------------------------------------- | --------------------------- |
| Direct call inside a method              | Forward the method's `ctx`  |
| Public API entry point                   | `Context.default()`         |
| RPC service method (proto-generated)     | `Context.default()`         |
| Event / callback subscription            | Lifecycle `this._ctx`       |
| setTimeout / scheduleTask / DeferredTask | Lifecycle `this._ctx`       |
| queueMicrotask                           | Lifecycle `this._ctx`       |
| Promise.all fan-out                      | Same `ctx` for all branches |
| No caller ctx available                  | Lifecycle `this._ctx`       |

## Common mistakes

- **Breaking the chain with `Context.default()` in an intermediate method** — if a method calls `child(Context.default())` where `child` has `@trace.span()`, the span is an orphaned root. The intermediate method must accept `ctx` from its caller and forward it.
- **Passing `this._ctx` in a direct call** when the method has `ctx` in scope — breaks trace hierarchy, creates a new root instead of a child span.
- **Passing `ctx` in a callback or `scheduleTask`** — captures a stale context whose span has already ended.
- **Adding `ctx` to Node.js protocol methods** (e.g., `[Symbol.for('nodejs.util.inspect.custom')]`) — fixed-signature methods that don't support extra parameters.
- **Adding `ctx` to public APIs** — user-facing methods should not expose `Context`; create `Context.default()` internally.
- **Using `this._ctx` in RPC service methods** — RPC boundaries are new entry points, not continuations of a lifecycle. Use `Context.default()`, not `this._ctx`. The proto-generated interface cannot accept `ctx`, so the RPC method is the root of a new trace.

## ESLint enforcement

The `dxos-plugin/require-context-param` rule warns on class methods missing `ctx: Context` as the first parameter. Configured in `eslint.config.mjs` for core SDK packages with exemptions for public API classes.

## Audit

See [AUDIT.md](./AUDIT.md) for a detailed review of context propagation compliance across the codebase, including known gaps and prioritized recommendations.
