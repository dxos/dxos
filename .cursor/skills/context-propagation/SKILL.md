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

Add `ctx: Context` to methods on the **networking path** — any call chain that reaches:

- **EDGE calls** (edge service RPCs).
- **WebSocket messages** (signaling, gossip).
- **Swarm / WebRTC connections** (mesh replication, peer discovery).
- **Feed replication** (Hypercore feed read/write over the network).
- **Credential notarization** (writes that hit the control pipeline and propagate to peers).

Do **not** add ctx to:

- **Public user-facing APIs** (called by app/plugin developers) — these create `ctx = Context.default()` internally and forward it.
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

## How context flows

```text
User code (no ctx)
  → public API creates ctx = Context.default()
    → @trace.span() method receives ctx
      decorator: creates span, derives child ctx, replaces args[0]
      → method body receives child ctx
        → intermediate method forwards child ctx
          → @trace.span() method receives child ctx
            decorator: creates child span, derives grandchild ctx
            → ...
```

Each `@trace.span()` method reads the parent span ID from the incoming ctx, creates a new span, derives a child context with the new span ID, and replaces `args[0]`. Methods without `@trace.span()` forward ctx as-is.

## Quick reference

| Situation                                | What ctx to use             |
| ---------------------------------------- | --------------------------- |
| Direct call inside a method              | Forward the method's `ctx`  |
| Public API entry point                   | `Context.default()`         |
| Event / callback subscription            | Lifecycle `this._ctx`       |
| setTimeout / scheduleTask / DeferredTask | Lifecycle `this._ctx`       |
| queueMicrotask                           | Lifecycle `this._ctx`       |
| Promise.all fan-out                      | Same `ctx` for all branches |
| No caller ctx available                  | Lifecycle `this._ctx`       |

## Common mistakes

- **Passing `this._ctx` in a direct call** when the method has `ctx` in scope — breaks trace hierarchy, creates a new root instead of a child span.
- **Passing `ctx` in a callback or `scheduleTask`** — captures a stale context whose span has already ended.
- **Adding `ctx` to Node.js protocol methods** (e.g., `[Symbol.for('nodejs.util.inspect.custom')]`) — fixed-signature methods that don't support extra parameters.
- **Adding `ctx` to public APIs** — user-facing methods should not expose `Context`; create `Context.default()` internally.

## ESLint enforcement

The `dxos-plugin/require-context-param` rule warns on class methods missing `ctx: Context` as the first parameter. Configured in `eslint.config.mjs` for core SDK packages with exemptions for public API classes.
