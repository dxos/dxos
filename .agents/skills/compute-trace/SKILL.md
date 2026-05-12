---
name: compute-trace
description: >-
  Architecture and API reference for the @dxos/compute Trace module
  (Trace.ts) — typed event stream emitted by Processes, Operations, and
  Agents and persisted via FeedTraceSink. Use when working with
  Trace.write, Trace.emitStatus, Trace.EventType, Trace.Message,
  Trace.TraceService, Trace.TraceSink, FeedTraceSink, OperationStart /
  OperationEnd, StatusUpdate, ComputeBeginEvent, CompleteBlock /
  PartialBlock, or when reading/rendering execution trace feeds in
  TracePanel.
---

# Compute Trace — Event Stream & Feed

The `Trace` module in `@dxos/compute` (source: `packages/core/compute/src/Trace.ts`) is the typed event stream for DXOS Processes, Operations, and Agents. Callers emit events through `TraceService`; a separately-installed `TraceSink` persists complete `Message` envelopes — typically into a dedicated ECHO Feed via `FeedTraceSink`.

This skill is **not** about `@dxos/tracing` (OTEL spans / `@trace.span()`). For that, see the [tracing](../tracing/SKILL.md) skill. They are disjoint systems: `@dxos/tracing` is for low-level OTEL span correlation; `Trace` is a higher-level, persistable, typed event log over Process execution.

```typescript
import { Trace } from '@dxos/compute';
import { FeedTraceSink } from '@dxos/functions-runtime';
```

## Architecture

```text
operation handler / process / node compute fn
        │  Trace.write(MyEvent, payload)
        ▼
┌──────────────────────────┐
│  TraceService            │   per-process writer; attaches Meta
│   (Context.Tag)          │   {pid, parentPid, conversationId, ...}
└──────────┬───────────────┘
           │  produces Trace.Message
           ▼
┌──────────────────────────┐
│  TraceSink               │   single global consumer
│   (Context.Tag)          │
└──────────┬───────────────┘
           │  Feed.append(traceFeed, [message, ...])
           ▼
┌──────────────────────────┐
│  ECHO Feed               │   kind = "dxos.org.feed.trace"
│  Trace.Message[]         │   typename = org.dxos.type.traceMessage
└──────────────────────────┘
           │  Query.select(Filter.type(Trace.Message)).from(feed)
           ▼
       TracePanel UI (buildExecutionGraph → Timeline)
```

The split between `TraceService` (writer) and `TraceSink` (consumer) is intentional: writers are scoped per-process and inject the right `Meta` for that scope; the sink is global and only sees ready-to-store `Message`s.

## Type hierarchy

```text
EventType<T>     ← static descriptor (key + schema + isEphemeral)
   ↓ Trace.write(EventType, payload) produces
Event            ← { timestamp, type, data }       single moment
   ↓ runtime batches into
Message          ← { meta, isEphemeral, events[] } persistable ECHO object
                                                   typename: org.dxos.type.traceMessage
```

### `EventType<T>`

Static descriptor — not a value, not a payload. Three fields:

- `key: string` — wire identifier, e.g. `"operation.start"`. Reverse-DNS-ish.
- `schema: Schema.Schema<T>` — payload schema (Effect Schema).
- `isEphemeral: boolean` — durability hint. Persistent sinks **may** drop ephemeral events; live UI streams keep them. **Note**: `FeedTraceSink` currently persists everything; the flag is informational at the storage layer today.

```typescript
export const StatusUpdate = Trace.EventType('status.update', {
  schema: Schema.Struct({ message: Schema.String }),
  isEphemeral: true,
});
```

`Trace.PayloadType<E>` extracts `T`. `Trace.isOfType(eventType, event)` is the type guard for reads.

### `Event`

`{ timestamp: number, type: string, data: unknown }`. `type` matches some `EventType.key`.

### `Meta`

Context attached to a _batch_ of events — the join key between the event stream and the rest of the system:

| field                             | role                                         |
| --------------------------------- | -------------------------------------------- |
| `pid`, `parentPid`, `processName` | process tree (filled by Process Manager)     |
| `conversationId`                  | back-reference to a chat / conversation feed |
| `triggerId`                       | when invocation came from a `Trigger`        |
| `toolCallId`                      | when the process was created by a tool call  |

`Meta` is what lets `TracePanel` reconstruct a forest of executions from a flat feed. Writers don't construct `Meta` — the runtime wraps with it when forwarding. The exception is `testTraceService({ meta })`, which bakes a fixed `Meta` in.

### `Message`

The persistable envelope: `{ meta, isEphemeral, events[] }`. ECHO object with `typename: 'org.dxos.type.traceMessage', version: '0.1.0'`. Multiple `Event`s may ride on a single `Message` to amortize writes.

## The two services

### `TraceService` — writer (depended on by emitting code)

`Context.Tag` carrying `TraceWriter`:

```typescript
interface TraceWriter {
  write<T>(eventType: EventType<T>, payload: T): void;
}
```

Code that records events depends on `TraceService` and emits with:

```typescript
yield* Trace.write(MyEvent, { ... });
yield* Trace.emitStatus('Syncing messages: 42'); // shorthand for StatusUpdate
```

`TraceService` is part of `Process.BaseServices`, so every process always has a writer in scope — never thread it manually inside operation handlers.

### `TraceSink` — consumer (single, global)

`Context.Tag` carrying `Sink`:

```typescript
interface Sink {
  write(message: Message): void;
}
```

Receives fully-formed `Message`s — already wrapped with `Meta`, possibly batched.

## Provided wirings

| Layer                              | Use                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Trace.writerLayerNoop`            | discard writes (tests; statically required `TraceService` that you don't want active)                              |
| `Trace.layerNoop`                  | trivial sink (drop)                                                                                                |
| `Trace.layerConsole`               | trivial sink (`console.log`)                                                                                       |
| `Trace.testTraceService({ meta })` | converts the sink-side service into a writer that emits 1 `Message` per `write` with fixed `Meta`; useful in tests |
| `FeedTraceSink.layerLive`          | real persistence: buffers `Message`s, batch-appends into the trace feed                                            |
| `FeedTraceSink.layerNoop`          | satisfies `FeedTraceSink` tag without persisting                                                                   |

## FeedTraceSink — the persistent sink

Source: `packages/core/functions-runtime/src/FeedTraceSink.ts`.

- Looks up or creates a feed of kind `dxos.org.feed.trace` (`namespace: 'trace'`, name `'Execution Trace'`) — `getOrCreateTraceFeed`.
- Buffers incoming `Message`s and flushes batches via `Feed.append(feed, messages)`.
- Provides both `Trace.TraceSink` and a `FeedTraceSink` tag (with `flush()`). On layer scope finalization, pending messages are flushed.
- The trace feed contains **only** `Trace.Message` (`org.dxos.type.traceMessage`) objects — no other writers target it.

Read messages back with:

```typescript
const feed = yield * FeedTraceSink.getOrCreateTraceFeed();
const messages = yield * Database.runQuery(Query.select(Filter.type(Trace.Message)).from(feed));
```

`FeedTraceSink.query` (`Query.select(Filter.type(Feed.Feed, { kind: TRACE_FEED_KIND })).orderBy(Order.natural)`) finds the feed itself; in pathological cases (>1 trace feed) `Order.natural` ensures clients pick the same one.

## Built-in event types

Defined in `Trace.ts`:

| EventType        | Key               | Ephemeral | Emitted by                                             |
| ---------------- | ----------------- | --------- | ------------------------------------------------------ |
| `OperationStart` | `operation.start` | no        | `Process.fromOperation` before each handler invocation; payload `{ key, name?, input?, runtime? }` — `input`/`runtime` are filled by executor integrations (e.g. EDGE function executors), not by `Process.fromOperation` (operation arguments may contain ECHO objects that fail strict schema encoding when wrapped in `Trace.Message`) |
| `OperationEnd`   | `operation.end`   | no        | `Process.fromOperation` after success/failure          |
| `StatusUpdate`   | `status.update`   | yes       | user code via `Trace.emitStatus(...)`                  |
| `Log`            | `log`             | no        | user code via `Trace.write(Trace.Log, { level, message, context? })` — replaces the legacy per-step `TraceEvent.logs[]` |
| `Exception`      | `exception`       | no        | user code via `Trace.write(Trace.Exception, { name, message, stack? })` — replaces the legacy per-step `TraceEvent.exceptions[]` |

Defined in adjacent modules but using the same machinery:

| Module                              | EventType(s)                                                                                                   | Notes                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `compute/Process.ts`                | `SpawnedEvent`, `ExitedEvent`                                                                                  | process lifecycle, durable          |
| `conductor/types/compute-events.ts` | `ComputeBeginEvent`, `ComputeEndEvent`, `ComputeInputEvent`, `ComputeOutputEvent`, `ComputeCustomEvent`        | graph-node execution, all ephemeral |
| `assistant/tracing.ts`              | `PartialBlock` (ephemeral), `CompleteBlock` (durable), `AgentRequestBegin`/`End`, `McpServerError` (ephemeral) | LLM session blocks                  |

Pattern: each subsystem owns its event types; they share the same `Message`/`Meta`/sink pipeline.

## Defining new events

Co-locate `EventType`s with the subsystem that emits them.

```typescript
import * as Schema from 'effect/Schema';
import { Trace } from '@dxos/compute';

export const MySubsystemFooHappened = Trace.EventType('mysubsystem.fooHappened', {
  schema: Schema.Struct({
    fooId: Schema.String,
    count: Schema.Number,
  }),
  isEphemeral: false,
});
```

Choose `isEphemeral`:

- `false` — durable lifecycle / outcome events (start, end, complete content block, error).
- `true` — high-volume streaming/progress data (token deltas, partial blocks, status strings, compute-graph node ticks).

## Emitting events

Inside any code that has `Trace.TraceService` in its requirements (every process handler does, via `Process.BaseServices`):

```typescript
import * as Effect from 'effect/Effect';
import { Trace } from '@dxos/compute';

const work = Effect.gen(function* () {
  yield* Trace.write(MySubsystemFooHappened, { fooId: '...', count: 1 });
  yield* Trace.emitStatus('Working on it...');
});
```

`Trace.emitStatus(message)` is a shorthand for `Trace.write(StatusUpdate, { message })` — useful for surface-level progress strings shown to the user.

## Wiring TraceService → TraceSink

The runtime is responsible for providing a writer that wraps each emitted event into a `Message` with the right `Meta` and forwards to the sink. Most call sites only pick a sink:

```typescript
// Production: persist to feed.
const layer = Layer.mergeAll(
  FeedTraceSink.layerLive, // provides TraceSink + FeedTraceSink
  // ... runtime wiring that builds TraceService from TraceSink
);

// Tests: write 1 message per write, fixed meta.
const testLayer = Layer.empty.pipe(
  Layer.provideMerge(Trace.testTraceService({ meta: { processName: 'test' } })),
  Layer.provideMerge(FeedTraceSink.layerLive),
  Layer.provideMerge(TestDatabaseLayer()),
);

// Tests / call sites that don't care: drop everything.
Effect.provide(Trace.writerLayerNoop);
```

`AssistantTestLayer` (in `functions-runtime/src/testing/assistant-test-layer.ts`) accepts `tracing: 'noop' | 'console' | 'pretty' | 'feed'` to pick the right combination.

## Reading the trace feed

`TracePanel` queries the feed and folds events into a forest of executions:

```typescript
// 1. Find the trace feed in the space.
AtomQuery.make(space.db, FeedTraceSink.query);
// 2. For the feed, query trace messages.
Query.select(Filter.type(Trace.Message)).from(feed);
// 3. buildExecutionGraph(messages) → branches (per pid) and commits (events).
```

Discriminate event kinds with the type guard:

```typescript
for (const event of message.events) {
  if (Trace.isOfType(Trace.OperationEnd, event)) {
    // event.data is fully typed as { key, name?, outcome, error? }.
  }
}
```

## Important caveats

- **Ephemeral events are still persisted today.** `FeedTraceSink.write` does not branch on `message.isEphemeral` — the buffer is flushed unconditionally (`FeedTraceSink.ts`). Treat `isEphemeral` as a hint; don't rely on it as a privacy/storage filter at the feed layer. If the intent ever becomes "never persisted," that filter belongs in `FeedTraceSink`.

- **The trace feed is distinct from chat / conversation feeds.** Chat messages do **not** go to `dxos.org.feed.trace`; only `Trace.Message`s do.

- **`Meta` is filled by the runtime, not by writers.** If you call `Trace.write` directly with a hand-rolled `TraceWriter`, you control `Meta` yourself; `testTraceService({ meta })` is the canonical pattern for that. In production, leave it to whichever process / runtime provides `TraceService`.

## File map

| File                                                                  | Purpose                                                                                                                                                    |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/compute/src/Trace.ts`                                  | `EventType`, `Event`, `Meta`, `Message`, `TraceService`, `TraceSink`, `write`, `emitStatus`, built-in event types, `testTraceService`, noop/console layers |
| `packages/core/compute/src/Process.ts`                                | `Process.BaseServices = Trace.TraceService`; `Process.fromOperation` emits `OperationStart`/`OperationEnd`; defines `SpawnedEvent`, `ExitedEvent`          |
| `packages/core/functions-runtime/src/FeedTraceSink.ts`                | `layerLive` — the only writer to the trace feed; buffered batched `Feed.append`; `getOrCreateTraceFeed`, `flush`, `query`, `TRACE_FEED_KIND`               |
| `packages/core/conductor/src/types/compute-events.ts`                 | Compute-graph EventTypes (`ComputeBeginEvent`, ...) and `logCustomEvent` helper                                                                            |
| `packages/core/assistant/src/tracing.ts`                              | Assistant EventTypes (`PartialBlock`, `CompleteBlock`, `AgentRequestBegin/End`, `McpServerError`)                                                          |
| `packages/core/functions-runtime/src/testing/assistant-test-layer.ts` | Test layer with `tracing: 'noop' \| 'console' \| 'pretty' \| 'feed'` switch                                                                                |
| `packages/plugins/plugin-assistant/src/containers/TracePanel/`        | UI consumer; `TracePanel.tsx`, `execution-graph.ts` (`buildExecutionGraph`)                                                                                |
