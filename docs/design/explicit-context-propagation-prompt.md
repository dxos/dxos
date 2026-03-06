# Task: Implement Explicit Context Propagation Across DXOS Codebase

## Background

Read `docs/design/distributed-tracing.md` for full architectural context.

DXOS needs hierarchical OTEL traces in the browser. The browser has no reliable async context propagation (Zone.js fails with native `async/await`, `AsyncContext` is not shipped). The chosen solution: **mandatory explicit context parameter threading** — every internal method takes `ctx: Context` as its first argument, Go-style.

The `@trace.span()` decorator already supports this. When `args[0]` is a `@dxos/context` `Context`, the decorator uses it as the parent span and replaces it with the new span's context before calling the method body. See `packages/common/tracing/src/api.ts`.

## Convention

### Rule: Every internal method takes `ctx: Context` as first parameter

```typescript
// YES — ctx is first param, forwarded to all callees
async open(ctx: Context): Promise<void> {
  await this._initPipeline(ctx);
  await this._loadData(ctx);
}

private async _initPipeline(ctx: Context): Promise<void> {
  await this.pipeline.start(ctx);
}

// NO — missing ctx
async open(): Promise<void> {
  await this._initPipeline();
}
```

### Exceptions: Public user-facing APIs

Methods called directly by application/plugin developers do NOT require `ctx`. These are entry points that create a root context internally:

- `Client` public methods (`client.spaces.create()`, `client.halo.createIdentity()`, etc.)
- ECHO database public APIs (`space.db.query()`, `space.db.add()`, etc.)
- ECHO public APIs (`EchoClient`, `EchoDatabase`, `Query`, etc.)
- `SpaceProxy` public properties and methods exposed to plugins
- React hooks and plugin lifecycle methods
- Any method that is part of the public `@dxos/client` or `@dxos/echo-*` API surface

Entry point pattern:
```typescript
// Public API — no ctx param, creates root context internally
async createSpace(options: CreateSpaceOptions = {}): Promise<Space> {
  const ctx = new Context();
  return this._createSpaceInternal(ctx, options);
}

// Internal — receives ctx
@trace.span()
private async _createSpaceInternal(ctx: Context, options: CreateSpaceOptions): Promise<Space> {
  await this._dataSpaceManager.createSpace(ctx, options);
}
```

### How ctx flows through a call chain

```
User code (no ctx)
  → public API creates ctx
    → @trace.span() method receives ctx, decorator creates child ctx
      → uninstrumented method receives ctx, forwards it
        → @trace.span() method receives ctx, decorator creates child ctx
          → ...
```

The `@trace.span()` decorator automatically replaces the incoming `ctx` with the new span's context. So each method in the chain receives a context that represents its parent span. Methods without `@trace.span()` just forward the same `ctx` they received.

## Scope

This is a **codebase-wide convention change**. It cannot be completed in one pass. Approach it incrementally:

For each package:
1. Add `ctx: Context` as first param to all internal methods (not just `@trace.span()` ones).
2. Update all callers to pass `ctx`.
3. For public entry points, create a `new Context()` or use the class lifecycle `this._ctx` and pass it to the first internal call.
4. Thread `ctx` through every intermediate method in the call chain between traced methods.

## Files Already Using `ctx: Context` (verify callers):
- `packages/core/echo/echo-pipeline/src/space/space.ts` — `_open(ctx)`
- `packages/core/echo/echo-pipeline/src/space/control-pipeline.ts` — `_consumePipeline(ctx)`, `_processMessage(ctx, msg)`
- `packages/core/echo/echo-db/src/core-db/automerge-doc-loader.ts` — `loadSpaceRootDocHandle(ctx, spaceState)`
- `packages/sdk/client-services/src/packlets/identity/identity.ts` — `open(ctx)`, `close(ctx)`

## Do NOT Modify:
- `packages/e2e/blade-runner/` — test infrastructure, leave as-is
- `packages/apps/composer-app/src/main.tsx` — test tracing classes, update to demonstrate the pattern
- Public API surfaces of `@dxos/client`

## Import

```typescript
import { Context } from '@dxos/context';
```

Import group: `@dxos` (between external deps and internal/relative imports).

## Handling Common Patterns

### Class with lifecycle context
Many classes already have `this._ctx: Context`. Use it as the root when no caller passes one:
```typescript
@trace.span()
async open(ctx: Context): Promise<void> {
  await this._initPipeline(ctx);
}

// Caller that is an entry point:
async onLifecycleStart(): Promise<void> {
  await this.open(this._ctx);
}
```

### setTimeout / event handlers / callbacks
These are new entry points — create a fresh Context:
```typescript
setTimeout(async () => {
  await this._consumePipeline(new Context());
});

this.event.on(async (data) => {
  const ctx = new Context();
  await this._handleEvent(ctx, data);
});
```

### Methods that currently create `new Context()` inline
Some callers already create `new Context()` before calling traced methods. Thread the caller's `ctx` instead where possible:
```typescript
// Before:
await this._inner.open(new Context());

// After — if the caller has ctx:
await this._inner.open(ctx);
```

## Testing

1. Build each modified package: `moon run <package-name>:build`
2. Run tests for modified packages: `moon run <package-name>:test`
3. Key packages: `tracing`, `echo-pipeline`, `echo-db`, `client-services`, `client`, `observability`
4. Run `pnpm -w pre-ci` at the end.

## Important

- Do NOT cast values to fix type errors. If a caller doesn't have a `Context`, trace the call chain upward to find where one should originate.
- Do NOT change return types or the `@trace.span()` decorator options.
- Keep `@synchronized` and other decorator ordering unchanged.
- The `@trace.span()` decorator makes methods `async`. All traced methods already return Promises.
- Some methods are called from both traced and untraced code paths. Make `ctx` the first required param for internal methods. If an untraced caller exists, that caller becomes an entry point and should create a `new Context()`.
