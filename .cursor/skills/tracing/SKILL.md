---
name: tracing
description: >-
  Architecture and API reference for @dxos/tracing. Use when working with
  TracingBackend, TRACE_PROCESSOR, @trace.resource(), @trace.span(),
  @trace.info(), metrics counters, diagnostics, ContextRpcCodec,
  tracing-types.ts, trace-processor.ts, or api.ts.
---

# Tracing — Architecture & API Reference

The `@dxos/tracing` package provides resource tracking, span creation, metrics, and diagnostics for DXOS. It defines a backend-agnostic `TracingBackend` interface — the `@dxos/observability` package provides the concrete OTEL implementation.

For rules on how to pass `ctx: Context` through methods to get connected traces, see the [context-propagation](../context-propagation/SKILL.md) skill.

```typescript
import { trace, TRACE_PROCESSOR } from '@dxos/tracing';
```

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  @dxos/tracing  (no OTEL dependency)                    │
│                                                         │
│  trace.resource()  trace.span()  trace.info()           │
│  trace.metricsCounter()  trace.diagnostic()             │
│  trace.spanStart() / trace.spanEnd()                    │
│  TRACE_PROCESSOR  ─── tracingBackend?: TracingBackend   │
│  ContextRpcCodec  (encode/decode for RPC)               │
└──────────────────────────┬──────────────────────────────┘
                           │ registers at startup
┌──────────────────────────▼──────────────────────────────┐
│  @dxos/observability                                    │
│                                                         │
│  OtelTraces implements TracingBackend                    │
│  Sets TRACE_PROCESSOR.tracingBackend at startup          │
└─────────────────────────────────────────────────────────┘
```

`TRACE_PROCESSOR` is a global singleton (`globalThis.TRACE_PROCESSOR`). It holds resources, logs, metrics, diagnostics, and the optional `tracingBackend`.

### OTEL initialization

OTEL is initialized synchronously (static imports in `extension.ts`) before any traced code runs. The `isObservabilityDisabled` check is deferred — OTEL defaults to enabled and disables async if the user opted out.

### Browser timeline

When `showInBrowserTimeline = true`, the `@trace.span()` decorator calls `performance.measure()` in the finally block. No custom span object is needed — just timestamps.

## TracingBackend Interface

Defined in `tracing-types.ts`. Implemented by `@dxos/observability`.

```typescript
interface TracingBackend {
  startSpan: (options: StartSpanOptions) => RemoteSpan;
  inject?: (opaqueContext: unknown) => TraceContextData | undefined;
  extract?: (traceContext: TraceContextData) => unknown;
}
```

- **`startSpan`** — required. Creates a span, returns `{ end(), spanContext? }`.
- **`inject`** — optional. Serializes an opaque `spanContext` to W3C `{ traceparent, tracestate }` for RPC wire format.
- **`extract`** — optional. Deserializes W3C trace context from the wire back to an opaque `spanContext`.

`inject`/`extract` exist because the opaque span context is a live OTEL `Context` runtime object that cannot survive protobuf serialization. They are called by `ContextRpcCodec` which is hardcoded in `RpcPeer`. Simple backends (e.g., Perfetto) only need `startSpan`.

## RemoteSpan

Returned by `TracingBackend.startSpan()`.

```typescript
type RemoteSpan = {
  end: () => void;
  spanContext?: unknown;
};
```

`spanContext` is stored on the DXOS `Context` via `TRACE_SPAN_ATTRIBUTE` (`'dxos.trace-span'`). It is an opaque OTEL `Context` object — the tracing package never inspects it. Child `@trace.span()` methods read it and pass it back as `StartSpanOptions.parentContext`.

## How the `@trace.span()` Decorator Works

1. Checks if `args[0]` is a `Context` — if so, reads the parent span from its `TRACE_SPAN_ATTRIBUTE`.
2. Calls `TRACE_PROCESSOR.tracingBackend?.startSpan({ name, parentContext, ... })`.
3. Derives a child `Context` with the new span's opaque context on `TRACE_SPAN_ATTRIBUTE`.
4. Replaces `args[0]` with the child context before calling the method body.
5. Calls `remoteSpan.end()` in a `finally` block.
6. If `showInBrowserTimeline`, also calls `performance.measure()` in the finally block.

If `args[0]` is not a `Context`, no parent linking occurs and no context replacement happens.

When `showInRemoteTracing = false`, the decorator skips steps 2-3 entirely. The child context has no `TRACE_SPAN_ATTRIBUTE`, so grandchild spans reconnect to the grandparent (trace continuity is preserved).

## RPC Trace Context (ContextRpcCodec)

`ContextRpcCodec` (in `rpc-trace-context.ts`) is hardcoded in `RpcPeer`. No configuration needed.

```text
Outgoing RPC:
  ctx.getAttribute(TRACE_SPAN_ATTRIBUTE)  →  inject()  →  TraceContextData on proto wire

Incoming RPC:
  TraceContextData from proto wire  →  extract()  →  new Context({ TRACE_SPAN_ATTRIBUTE: opaque })
```

When no backend is registered, `encode` returns `undefined` (no trace header) and `decode` returns `Context.default()` (new root span). Encoding failures are logged as warnings and do not break the RPC call.

## API Reference

### `@trace.resource()`

Class decorator. Registers every instance as a tracked resource in `TRACE_PROCESSOR.resources`. Required for `@trace.info()` and `@trace.metricsCounter()` to work.

```typescript
@trace.resource()
class DataSpace {
  // ...
}
```

With an annotation symbol for programmatic lookup:

```typescript
const DataSpaceResource = Symbol.for('DataSpace');

@trace.resource({ annotation: DataSpaceResource })
class DataSpace {
  // ...
}

// Later: find all DataSpace instances.
TRACE_PROCESSOR.findResourcesByAnnotation(DataSpaceResource);
```

### `@trace.span()`

Method decorator. Creates a span for the method's execution duration.

```typescript
@trace.resource()
class DataSpace {
  @trace.span()
  async open(ctx: Context): Promise<void> {
    await this._initPipeline(ctx);
  }
}
```

#### Options

```typescript
@trace.span({
  // Show in browser Performance tab (calls performance.measure()).
  showInBrowserTimeline: true,

  // When false, span is NOT sent to OTLP collector. Defaults to true.
  // Grandchild spans reconnect to the grandparent.
  showInRemoteTracing: false,

  // Span category.
  op: 'db.query',

  // Static attributes attached to the span.
  attributes: { 'ctx.space': 'my-space' },
})
async query(ctx: Context): Promise<void> { ... }
```

### `@trace.info()`

Property/method decorator. Exposes a value in the resource's info section (visible in devtools diagnostics).

```typescript
@trace.resource()
class DataSpace {
  @trace.info()
  get spaceId(): string { return this._spaceId; }

  // Enum values are converted to their string representation.
  @trace.info({ enum: SpaceState })
  get state(): SpaceState { return this._state; }

  // Control serialization depth (default: 0 = toString, null = unlimited up to 8).
  @trace.info({ depth: 2 })
  get config(): object { return this._config; }
}
```

### `@trace.metricsCounter()`

Property decorator. Attaches a metrics counter to the resource. The property must be initialized with a counter instance.

```typescript
import { MapCounter, UnaryCounter, TimeSeriesCounter, TimeUsageCounter } from '@dxos/tracing';

@trace.resource()
class RpcServer {
  @trace.metricsCounter()
  private readonly _requestCount = new UnaryCounter();

  @trace.metricsCounter()
  private readonly _callMetrics = new MapCounter();

  handleRequest(method: string): void {
    this._requestCount.inc();
    this._callMetrics.inc(`${method} request`);
  }
}
```

Available counters:
- **`UnaryCounter`** — single incrementing value. `inc(by?: number)`.
- **`MapCounter`** — keyed counters. `inc(key: string, by?: number)`.
- **`TimeSeriesCounter`** — time-bucketed values. `inc(by?: number)`.
- **`TimeUsageCounter`** — tracks active time. `start()` / `stop()`.

### `trace.diagnostic()`

Registers a named diagnostic that can be queried via the diagnostics channel.

```typescript
trace.diagnostic({
  id: 'space-status',
  name: 'Space Status',
  fetch: async () => ({
    spaces: this._spaces.length,
    openConnections: this._connections.size,
  }),
});
```

### `trace.mark()`

Emits a `performance.mark()` for the browser timeline.

```typescript
trace.mark('space-ready');
```

### `trace.addLink()`

Declares a parent-child relationship between two traced resource instances.

```typescript
@trace.span()
async openFeed(ctx: Context): Promise<Feed> {
  const feed = new Feed();
  trace.addLink(this, feed, {});
  return feed;
}
```

### `trace.spanStart()` / `trace.spanEnd()`

Manual span API for cases where decorator-based spans don't fit (e.g., spans that cross method boundaries).

```typescript
trace.spanStart({
  id: `replication-${peerId}`,
  instance: this,
  methodName: 'replicate',
  parentCtx: this._ctx,
  op: 'replication',
});

// ... later, potentially in a different method or callback ...

trace.spanEnd(`replication-${peerId}`);
```

### `trace.metrics`

Access to `RemoteMetrics` for publishing OTEL-compatible metrics.

## TRACE_PROCESSOR

Global singleton. Key fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `tracingBackend` | `TracingBackend?` | Set by observability package at startup. |
| `resources` | `Map<number, ResourceEntry>` | All `@trace.resource()` instances. |
| `resourceInstanceIndex` | `WeakMap<any, ResourceEntry>` | Instance → resource lookup. |
| `logs` | `LogEntry[]` | Captured ERROR/WARN/TRACE log entries. |
| `diagnostics` | `DiagnosticsManager` | Registered diagnostics. |
| `remoteMetrics` | `RemoteMetrics` | OTEL-compatible metrics publishing. |

Key methods:
- `getDiagnostics()` — returns `{ resources, logs }`.
- `findResourcesByClassName(name)` — find resources by class name.
- `findResourcesByAnnotation(symbol)` — find resources by annotation.
- `refresh()` — updates all resource info and metrics.

## Complete Example

```typescript
import { Context } from '@dxos/context';
import { MapCounter, trace } from '@dxos/tracing';

const SpaceResource = Symbol.for('Space');

@trace.resource({ annotation: SpaceResource })
class Space {
  @trace.info()
  get id(): string { return this._id; }

  @trace.info({ enum: SpaceState })
  get state(): SpaceState { return this._state; }

  @trace.metricsCounter()
  private readonly _mutations = new MapCounter();

  @trace.span({ showInBrowserTimeline: true })
  async open(ctx: Context): Promise<void> {
    await this._loadPipeline(ctx);
    await this._startReplication(ctx);
    trace.mark('space-open');
  }

  @trace.span()
  async close(ctx: Context): Promise<void> {
    await this._stopReplication(ctx);
  }

  @trace.span({ op: 'db.write' })
  async mutate(ctx: Context, objectId: string, data: any): Promise<void> {
    this._mutations.inc(objectId);
    await this._applyMutation(ctx, objectId, data);
  }

  private async _loadPipeline(ctx: Context): Promise<void> { /* ... */ }
  private async _startReplication(ctx: Context): Promise<void> { /* ... */ }
  private async _stopReplication(ctx: Context): Promise<void> { /* ... */ }
  private async _applyMutation(ctx: Context, id: string, data: any): Promise<void> { /* ... */ }
}
```

## File Map

| File | Purpose |
| --- | --- |
| `api.ts` | Public `trace` object with all decorators and functions. |
| `tracing-types.ts` | `RemoteSpan`, `StartSpanOptions`, `TracingBackend`, `TraceContextData`. |
| `trace-processor.ts` | `TraceProcessor` singleton, `ResourceEntry`, `TRACE_PROCESSOR`. |
| `rpc-trace-context.ts` | `ContextRpcCodec` — encode/decode for RPC boundaries. |
| `symbols.ts` | `TRACE_SPAN_ATTRIBUTE`, `TracingContext`, `getTracingContext`. |
| `metrics/` | Counter implementations (`UnaryCounter`, `MapCounter`, etc.). |
| `diagnostic.ts` | `DiagnosticsManager` for queryable diagnostics. |
| `diagnostics-channel.ts` | Node.js diagnostics channel integration. |
