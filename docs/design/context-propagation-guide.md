# Context Propagation Guide

## Overview

Every internal method takes `ctx: Context` as its first parameter (Go-style). This enables hierarchical OTEL traces in the browser without Zone.js. The `@trace.span()` decorator detects `ctx` as `args[0]`, uses it as the parent span, and replaces it with a child context before calling the method body.

```typescript
import { Context } from '@dxos/context';
```

## Rules

### 1. Direct calls: forward the caller's ctx

Any sync or async call inside a method should receive the method's `ctx`.

```typescript
@trace.span()
async open(ctx: Context): Promise<void> {
  await this._initPipeline(ctx);
  await this._loadData(ctx);
}

private async _initPipeline(ctx: Context): Promise<void> {
  await this.pipeline.start(ctx);
}
```

For **public user-facing methods** (called by app/plugin developers), create a root context once at the top and forward it:

```typescript
async createSpace(options: CreateSpaceOptions = {}): Promise<Space> {
  const ctx = Context.default();
  return this._createSpaceInternal(ctx, options);
}
```

### 2. Event subscriptions and callbacks: use lifecycle ctx

Callbacks registered on events, streams, or external systems are new entry points. They don't have a caller-provided ctx. Use the class lifecycle context (`this._ctx` from `Resource`, or a manually managed `Context`).

```typescript
this._spaceStateMachine.onFeedAdmitted.set(async (info) => {
  await this._handleFeedAdmitted(this._ctx, info);
});

this.stateUpdate.on(this._ctx, () => {
  this._refresh(this._ctx);
});
```

The lifecycle ctx is correct because:
- It is scoped to the lifetime of the owning object.
- It is disposed when the object closes, automatically cancelling pending work.
- It carries no trace span — these callbacks are trace roots.

### 3. Detached async work: use class lifecycle ctx

`setTimeout`, `scheduleTask`, `DeferredTask`, `scheduleMicroTask`, and `queueMicrotask` create work that runs outside the caller's call stack. The original span has ended. Use the class lifecycle `this._ctx` — it ties the work to the object's lifetime and is disposed on close.

```typescript
setTimeout(async () => {
  await this._consumePipeline(this._ctx);
});

this._updateTask = new DeferredTask(this._ctx, () =>
  this._executeQueries(this._ctx),
);

scheduleMicroTask(this._ctx, async () => {
  await this._handleFeedAdmission(this._ctx, info);
});

queueMicrotask(async () => {
  await this._processNewRoot(this._ctx, rootUrl);
});
```

The lifecycle ctx is the right choice because:
- The work belongs to the class instance and should be cancelled when it closes.
- `Context.default()` creates an orphaned context nobody disposes — a resource leak.
- The lifecycle ctx carries no trace span, so these become trace roots (correct for detached work).

### 4. Parallel fan-out (Promise.all): share the parent ctx

When a method fans out to multiple concurrent calls, pass the same `ctx` to each. The `@trace.span()` decorator derives a child context per span, so concurrent spans get independent contexts with a shared parent.

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

### 5. Class lifecycle ctx

Many classes (especially `Resource` subclasses) have `private _ctx = Context.default()`. This context is tied to the object's open/close lifecycle and disposed on close.

Use it when:
- A method is called from a lifecycle hook and no caller-provided ctx exists.
- Registering event handlers or scheduling background work.
- Running detached tasks (setTimeout, DeferredTask, etc.).

```typescript
class DataSpace {
  private _ctx = Context.default();

  async activate(): Promise<void> {
    await this._open(this._ctx);
    this.initializeDataPipelineAsync(this._ctx);
  }

  private async _close(ctx: Context): Promise<void> {
    await this._ctx.dispose();
    this._ctx = Context.default();
    // ...
  }
}
```

`Context.default()` should only be used:
- In public API entry points (creating the root trace context).
- Resetting `this._ctx` after dispose (as shown above).

## How context flows through a call chain

```text
User code (no ctx)
  → public API creates ctx = Context.default()
    → @trace.span() method receives ctx
      decorator: creates span, derives child ctx, replaces args[0]
      → method body receives child ctx
        → intermediate method receives child ctx, forwards it
          → @trace.span() method receives child ctx
            decorator: reads TRACE_SPAN_ATTRIBUTE → parent span ID
            creates child span, derives grandchild ctx
            → ...
```

Each `@trace.span()` method automatically:
1. Reads the parent span ID from the incoming ctx (`getAttribute(TRACE_SPAN_ATTRIBUTE)`).
2. Creates a new span with that parent.
3. Derives a new child context with `TRACE_SPAN_ATTRIBUTE` set to the new span's ID.
4. Replaces `args[0]` so the method body and its callees see the new context.

Methods **without** `@trace.span()` just forward ctx as-is, preserving the chain.

## Summary

| Situation | What ctx to use |
|---|---|
| Direct call inside a method | Forward the method's `ctx` |
| Public API entry point | `Context.default()` |
| Event/callback subscription | Lifecycle `this._ctx` |
| setTimeout / scheduleTask / DeferredTask | Lifecycle `this._ctx` |
| queueMicrotask | Lifecycle `this._ctx` |
| Promise.all fan-out | Same `ctx` for all branches |
| No caller ctx available | Lifecycle `this._ctx` |

## ESLint enforcement

The `dxos-plugin/require-context-param` rule warns on class methods missing `ctx: Context` as the first parameter. It is configured in `eslint.config.mjs` for core SDK packages with exemptions for public API classes.
