# Distributed Tracing in DXOS

## Status

Draft — March 2026

## Overview

This document describes the current DXOS tracing architecture, the async context propagation problem in browsers, viable solutions, and integration with Effect-TS tracing.

---

## 1. Current Tracing APIs

### 1.1 Two-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│  DXOS Tracing API   (@dxos/tracing)             │
│  @trace.resource()  @trace.span()               │
│  TracingSpan, DXOS Context, TRACE_PROCESSOR     │
├─────────────────────────────────────────────────┤
│  RemoteTracing bridge                           │
│  Maps TracingSpan ↔ OTEL Span                   │
│  wrapExecution() / flushSpan()                  │
├─────────────────────────────────────────────────┤
│  OTEL Layer (@dxos/observability)               │
│  WebTracerProvider → OTLPTraceExporter → SigNoz │
│  ZoneContextManager, W3CTraceContextPropagator  │
└─────────────────────────────────────────────────┘
```

### 1.2 Decorator API

`@trace.resource()` — Class decorator. Registers each instance as a named resource (e.g., `Space#2`).

`@trace.span()` — Method decorator. Wraps the method in a span. Handles parent resolution, instance context storage, and OTEL context wrapping.

```typescript
@trace.resource()
class Space {
  @trace.span({ showInBrowserTimeline: true })
  async open() {
    await this.startPipeline(); // finds parent via this[TRACE_SPAN_ATTRIBUTE]
  }

  @trace.span()
  async startPipeline() { ... }
}
```

Other APIs: `trace.info()`, `trace.spanStart(id)` / `trace.spanEnd(id)`, `trace.metricsCounter()`, `trace.diagnostic()`.

### 1.3 How Parent Resolution Works

```
@trace.span() called
│
│ Phase 1 — DXOS layer (api.ts)
│
├─ 1. args[0] is a DXOS Context?  ──yes──→ use it (explicit parameter)
├─ 2. this[TRACE_SPAN_ATTRIBUTE]? ──yes──→ use it (same-instance chain)
└─ 3. neither                     ──────→ parentId = null
       │
       │ Phase 2 — OTEL layer (RemoteTracing → traces-browser.ts)
       │
       ├─ 4. parentId set? look up parent OTEL span in _spanMap ──found──→ use as OTEL parent
       ├─ 5. otelContext.active() via ContextManager (Zone.js) ──has span──→ use as OTEL parent
       └─ 6. nothing ──→ new root span (new traceID)
```

Steps 1-2 survive `await`. Step 5 only works for synchronous calls (see Section 3).

---

## 2. The Uninstrumented Intermediary Problem

A traced method calls an untraced method, which calls another traced method on a different instance:

```typescript
@trace.resource()
class ServiceA {
  @trace.span()
  async handleRequest() {
    const bridge = new Bridge();
    await bridge.forward();       // Bridge is NOT instrumented
  }
}

class Bridge {                    // no decorators
  async forward() {
    const downstream = new ServiceB();
    await downstream.process();   // ServiceB IS instrumented
  }
}

@trace.resource()
class ServiceB {
  @trace.span()
  async process() {
    await this.finalStep();
  }

  @trace.span()
  async finalStep() { ... }
}
```

```
Expected:                         Actual:

ServiceA.handleRequest            ServiceA.handleRequest  (trace 1)
└── ServiceB.process              ServiceB.process        (trace 2, separate!)
    └── ServiceB.finalStep            └── ServiceB.finalStep
```

- `process` → `finalStep`: works (same instance, `this[TRACE_SPAN_ATTRIBUTE]`).
- `handleRequest` → `process`: broken (different instances, uninstrumented gap, Zone.js doesn't survive `await`).

### Why Not Instrument Everything?

Adding `@trace.span()` to all methods is not viable: the decorator coerces sync methods to `async` (returns `Promise<T>` instead of `T`), which is a breaking API change. It also floods the trace backend with noise and adds per-call overhead (OTEL span creation, zone fork, flush).

`@trace.resource()` alone doesn't help — it only registers instances for devtools, it doesn't propagate context.

---

## 3. The Zone.js `await` Problem

### 3.1 How Zone.js Stores Context

Zone.js maintains a tree of zones. `ZoneContextManager` stores OTEL context in zone properties:

```
active() → Zone.current.get('OT_ZONE_CONTEXT')
with(ctx, fn) → Zone.current.fork({ OT_ZONE_CONTEXT: ctx }).run(fn)
```

When `otelContext.with(spanCtx, fn)` runs `fn` in a forked zone, any code inside `fn` reads `spanCtx` via `otelContext.active()`. Each fork is independent, so concurrent spans don't interfere.

### 3.2 The Problem: Native `async/await` Escapes Zones

Modern browsers implement `async/await` natively. When execution hits `await`, the continuation is scheduled via engine-internal mechanisms that bypass `Zone.current`. Zone.js patches `Promise.prototype.then`, but V8's native async/await can bypass the patched `.then()`.

```
Zone.current.fork({ name: 'myZone' }).run(async () => {
  Zone.current.name → "myZone"     ✓ (before first await)
  await delay(10);
  Zone.current.name → "<root>"     ✗ (zone lost after await!)
});
```

Verified in Composer running in Chrome via Vite dev server (March 2026).

### 3.3 Known Issues

This is one of the most well-documented problems in the OTel browser tracing ecosystem:

- [OTel JS #1502](https://github.com/open-telemetry/opentelemetry-js/issues/1502) (2020, closed with docs) — the original canonical issue. Recommends transpiling to ES2015 or explicit context propagation.
- [OTel JS #5104](https://github.com/open-telemetry/opentelemetry-js/issues/5104) (Nov 2024, open) — documents that Zone.js only works when async/await is **transpiled** to generator + Promise chains. Confirms the esbuild `supported` config as workaround.
- [OTel JS #5914](https://github.com/open-telemetry/opentelemetry-js/issues/5914) (Sep 2025, open, 8 upvotes) — "Browser async context gets lost after second await." OTel maintainer pichlermarc: *"We're kind of blocked on JavaScript language features to make this happen."*
- [Zone.js #1140](https://github.com/angular/zone.js/pull/1140) — WIP PR to support native async/await, opened Sep 2018, abandoned Jul 2019. Author: *"there are some cases this solution will not work."*
- [OTel Discussion #6288](https://github.com/open-telemetry/opentelemetry-js/discussions/6288) (Jan 2026) — request for zoneless async ContextManager. Confirmed: no browser-compatible alternative exists. Polyfills like `@webfill/async-context` use Zone.js under the hood — same limitation.

### 3.4 OTel's Strategic Direction for Browsers

OTel maintainer pichlermarc (Oct 2025, #5914):

> *"Semantic Conventions for Client instrumentation are mostly moving toward an OTel event (logs-like) based approach, where everything is tied together with a Session ID instead. This circumvents this problem by choosing a completely different approach... without async context we'll likely never be able to provide proper (=no config needed ootb) for a Trace SDK in the browser."*

This session-based model emits flat events tied by session ID + timestamp instead of building parent-child span trees. No context propagation needed — correlation happens at query time. It's the model used by traditional RUM tools (Datadog RUM, Sentry Sessions). The trade-off: you lose the call tree hierarchy.

This signals the OTel project may deprioritize browser trace context propagation. For DXOS, we want hierarchical traces, so we need our own solution.

---

## 4. Viable Solutions

### 4.1 Zone.js + Transpiled `async/await`

Configure esbuild to downlevel `async/await` to generator-based code. Zone.js intercepts `.then()` on the resulting Promise chains and restores the zone on continuations.

```typescript
// vite.config.ts
export default defineConfig({
  esbuild: {
    supported: {
      'async-await': false,
      'async-generator': false,
    },
  },
});
```

```
Survives await:       YES (transpiled code uses .then() chains)
Cross-instance:       YES
Concurrent-safe:      YES (each zone fork is independent)
Uninstrumented gaps:  YES
```

**Pros:** Full coverage. No code changes. Uninstrumented intermediaries automatically carry context.
**Cons:** All code is transpiled (minor perf overhead, slightly different stack traces). Vite production build needs the same config.
**Risk:** Low. Effect-TS generators (`function*` / `yield*`) are unaffected — only `async function` / `await` is transpiled.

Note: Angular historically used this approach but is migrating to zoneless change detection (Angular 19+), removing Zone.js entirely. The transpilation is a tactical workaround, not an industry-endorsed long-term pattern.

### 4.2 Mandatory Context Parameter Threading

Make `Context` the first argument of every `@trace.span()` method. The decorator already supports this — when `args[0]` is a `Context`, it uses it as parent and replaces it with the new span's context before calling the method body.

```typescript
@trace.resource()
class ServiceA {
  @trace.span()
  async handleRequest(ctx: Context) {
    const bridge = new Bridge();
    await bridge.forward(ctx);       // pass context through
  }
}

class Bridge {
  async forward(ctx: Context) {      // accept and forward
    const downstream = new ServiceB();
    await downstream.process(ctx);   // pass context through
  }
}

@trace.resource()
class ServiceB {
  @trace.span()
  async process(ctx: Context) {      // decorator picks up ctx from args[0]
    await this.finalStep(ctx);       // ctx is now span.ctx (auto-replaced by decorator)
  }

  @trace.span()
  async finalStep(ctx: Context) { ... }
}
```

```
Survives await:       YES (context is a value, not ambient state)
Cross-instance:       YES
Concurrent-safe:      YES (each call carries its own context)
Uninstrumented gaps:  YES (but intermediaries must accept and forward ctx)
```

**Pros:** No Zone.js needed. No transpilation. Explicit and debuggable — context flow is visible in code. Already supported by the decorator.
**Cons:** Every traced method signature changes (~60 usages). Uninstrumented intermediaries must accept and forward `ctx`. Easy to break — a single function that drops `ctx` breaks the chain.

**Migration path:**
1. Add `ctx: Context` as first param to all `@trace.span()` methods.
2. The decorator handles entry points automatically: when no `Context` is passed, `parentCtx` falls back to `this[TRACE_SPAN_ATTRIBUTE]` then to `otelContext.active()`, then creates a root span. So public entry points called by untraced code still work.
3. Uninstrumented intermediaries add `ctx: Context` to their signatures and forward it.
4. Optionally enforce via an ESLint rule that checks `@trace.span()` methods have `Context` as first param.

### 4.3 `AsyncContext.Variable` (TC39 Proposal)

Native engine-level async context propagation. Equivalent to Node.js `AsyncLocalStorage` for browsers.

```
Survives await:       YES (native engine support)
Cross-instance:       YES
Concurrent-safe:      YES (snapshot-based)
Uninstrumented gaps:  YES
```

The correct long-term solution. TC39 Stage 2 as of Feb 2026, WHATWG web integration Stage 0. No browser ships it. No timeline.

### 4.5 Comparison

```
                       survives   cross-     concurrent-  uninstrumented  code
                       await?     instance?  safe?        gaps?           changes?
                       ────────   ─────────  ───────────  ──────────────  ────────
Zone.js + transpile    YES        YES        YES          YES             build config
Mandatory ctx param    YES        YES        YES          YES             everything
AsyncContext (future)  YES        YES        YES          YES             none
```
