# @dxos/pipeline — Design

**Date:** 2026-07-02
**Status:** Approved for planning
**Author:** rich@braneframe.com (with Claude)

## Motivation

`@dxos/transcription-pipeline`'s `PipelineRuntime` is a capable but transcription-specific stream
driver: it turns a continuous event stream into discrete, windowed stage invocations over a shared
sliding window, with per-stage concurrency policy, model routing, and ECHO-shaped writes.

Much of that machinery is reusable across data-processing pipelines (email triage, document
ingestion, event enrichment), but today it is coupled to:

- `ContentBlock.Transcript` as the window item type,
- a fixed `block` / `silence` / `tick` trigger vocabulary,
- `DXN` model routing and `PipelineConfig` (an ECHO type),
- an `EntityLookup`-specific stage context,
- owned `forkDaemon` fibers with `latest-wins` / `skip-if-busy` interruption (drop/interrupt
  semantics — the _opposite_ of back pressure).

This document specifies a new, deliberately **simple** package `@dxos/pipeline` that keeps the
genuinely reusable kernel — a back-pressured stream from source to sink, shared context, and a
typed write/sink seam — and lets transcription (and other pipelines) be built on top of it.

## Goals

- A small, generic, back-pressured streaming pipeline usable by any DXOS data-processing use case.
- **Basic back pressure** as a first-class, configurable concern.
- Enough surface to re-express the transcription pipeline (correction → extraction → summarization)
  without special-casing it in the core.
- Stages stay pure and testable via a pluggable sink (in-memory capture in tests, ECHO in prod).

## Non-Goals

- Replacing `@dxos/transcription-pipeline` in this change. (A follow-up may port it; not in scope.)
- Model routing, `DXN`, `PipelineConfig`, telemetry, ASR — all transcription-specific, left out.
- Distributed / multi-process execution. Single in-process `Stream` only.
- A general DAG / fan-out topology. The core is a **linear chain**; branching is out of scope.

## Core Model

A pipeline is an **ordered chain of stages** transforming a pull-based Effect `Stream` from a
`source` to a `Sink`, with a single injected `Ctx` shared by every stage. Because Effect `Stream`
is pull-based, and stages compose as stream transforms, back pressure is the _default_ behavior:
if the sink lags, the bounded buffer fills, upstream pulls stop, and the source is throttled —
end to end, with no lost items unless a stage explicitly opts into a lossy overflow policy.

### Substrate

- **Runtime:** Effect `Stream` + `Effect` (matches DXOS idiom; reuses proven pull-based
  back pressure). Effect `3.21.4`.
- **No fibers to own:** dropping the `forkDaemon` + interruption model removes `Fiber`/`Ref`
  bookkeeping entirely. Concurrency, buffering, and cancellation come from `Stream` combinators.

### Types

Generic core; **no `@dxos/types` dependency**. `Ctx` is opaque to the core.

```ts
// A stage transforms a stream of In into a stream of Out, given the shared context.
// Stream-to-stream is the composable primitive; authors use the constructors below, not this,
// so they never touch Stream directly.
export interface Stage<in In, out Out, in Ctx, out E = never> {
  readonly id: string;
  transform(input: Stream.Stream<In, E>, ctx: Ctx): Stream.Stream<Out, E>;
}

// Terminal commit. Keeps the write-description + sink seam: stages emit typed Out values
// describing an effect; the sink applies them (in-memory capture in tests, ECHO in prod).
export type Sink<Out, Ctx, E = never> = (out: Out, ctx: Ctx) => Effect.Effect<void, E>;
```

### Stage constructors ("simple" lives here)

Authors compose pipelines from these; the raw `Stage.transform` interface is an escape hatch.

- `Stage.map(id, fn, options?)` — 1:1 async transform.
  `fn: (item: In, ctx: Ctx) => Effect.Effect<Out, E>`.
  `options.concurrency` defaults to **1 → ordered + back-pressured**. Higher `n` bounds in-flight
  parallelism (still back-pressured) but may reorder — opt in only where order is irrelevant.
  Implemented with `Stream.mapEffect(fn, { concurrency })`.

- `Stage.window(id, size, fn)` — sliding-window transform (see below).
  `fn: (window: readonly In[], ctx: Ctx) => Effect.Effect<Out, E>`.
  `size` must be a positive integer; the constructor throws `RangeError` otherwise (a non-positive
  `size` would make `.slice(-size)` degenerate — `slice(-0)` returns the whole array).

- `Stage.filter(id, pred)` — drop items that do not match. `pred: (item: In) => boolean`.
  Implemented with `Stream.filter`.

`Out` is frequently `Out | undefined` for stages that sometimes have nothing to emit. The runtime
drops `undefined` **between every stage and before the sink** (a `Stream.filter` after each stage's
transform in the fold), so a stage can no-op cleanly at _any_ position in the chain — a mid-chain
stage's `undefined` never reaches the next stage's input. (Consequence: a pipeline whose `Out`
legitimately includes `undefined` as a real value cannot deliver it; `undefined` always means
no-op. Documented on `Pipeline.run`.) All stages and the source/sink share one error type `E`
(`RunOptions<In, Out, Ctx, E>`); mixing distinct stage error types requires widening to their union
at the call site — a typed per-stage builder is deferred future work.

### Windowing (in core — rationale)

`Stage.window` keeps a **fixed-size rolling view** of the last `size` items and invokes `fn` once
per incoming item with the current window. It is included in the core (rather than pushed to a
transcription-only helper) for three reasons:

1. **It is the load-bearing primitive for the transcription use case** — correction, extraction,
   and summarization all operate over a window of recent blocks, not a single item. Without it the
   core cannot claim to "serve the transcription use case."
2. **It is genuinely generic** — email threading, log correlation, and event de-duplication all
   want "the last N items" just as much as transcription does. It is not transcription-shaped.
3. **Its memory is bounded by design** — the window is capped at `size`, so it never grows with
   session length. This is distinct from, and composes with, the overflow buffer (below): the
   window bounds _how much context a stage sees_; the buffer bounds _rate mismatch between stages_.

Back pressure is preserved: `Stage.window` is a `Stream.mapAccum`-style scan (append item, evict
oldest beyond `size`) feeding `mapEffect` at concurrency 1 — still pull-based, still ordered.
It adds ~15 lines and no new dependency.

### Overflow policy (per-pipeline, per-stage override) — decision 1b

Different pipelines need different behavior when a consumer cannot keep up:

- **`suspend`** (default) — back pressure, never drop. Correct for email/document processing where
  every item must be handled.
- **`sliding`** — drop the _oldest_ buffered item, keep the latest. Correct for live transcription,
  where only the most recent window matters and staleness is worse than loss (this replaces the
  original's `latest-wins` intent without owning fibers).
- **`dropping`** — drop the _newest_ item when the buffer is full. Available for completeness.

These map directly onto Effect's `Stream.buffer({ capacity, strategy })` strategies
(`"suspend" | "sliding" | "dropping"`), so the feature is essentially free.

Granularity:

- **Pipeline-level default** via `Pipeline.run({ overflow, bufferSize })`.
- **Per-stage override** via the stage constructor `options.overflow` (e.g. transcription can run
  `correct` with `suspend` but `summarize` with `sliding`). For `map` the buffer is inserted at the
  stage's async boundary — _before_ `mapEffect` — so under load it sheds/coalesces in-flight input
  (`sliding` = true latest-wins, `dropping` = skip-while-busy); a buffer after the async work would
  bound outputs only and leave the policy inert. For `window` the buffer sits after windowing (a
  window must observe every item), bounding output rate.

### Runtime

```ts
export type RunOptions<In, Out, Ctx, E> = {
  readonly source: Stream.Stream<In, E>;
  readonly stages: readonly Stage<any, any, Ctx, E>[]; // chained left-to-right
  readonly sink: Sink<Out, Ctx, E>;
  readonly context: Ctx;
  readonly overflow?: 'suspend' | 'sliding' | 'dropping'; // default 'suspend'
  readonly bufferSize?: number; // default 16
};

export const Pipeline = Object.freeze({
  run: <In, Out, Ctx, E>(options: RunOptions<In, Out, Ctx, E>): Effect.Effect<void, E> => { ... },
});
```

Behavior:

1. Fold the stages over the source: `stages.reduce((s, stage) => stage.transform(s, ctx), source)`.
2. Apply the pipeline-level `Stream.buffer({ capacity: bufferSize, strategy: overflow })`.
3. Drain: `Stream.runForEach(out => sink(out, ctx))`.

The typing note: the fold is heterogeneously typed (each stage's `Out` is the next stage's `In`).
The core stores stages as `Stage<any, any, Ctx, E>` internally, but `Pipeline.run`'s **public**
signature is `<In, Out, Ctx, E>` (source item type and final sink type). A typed builder that
threads intermediate types across `.pipe(stage)` calls is a possible future ergonomic addition;
the initial version keeps the array form with the `any`-internal fold. The `any`s are confined to
the runtime's internal chaining (a genuine heterogeneous-list type-system boundary), documented
inline, and never leak into stage-author or caller code.

## Package Structure

```
packages/core/compute/pipeline/
  package.json        // @dxos/pipeline, "private": true
  moon.yml            // library; entrypoints: src/index.ts, src/testing/index.ts
  src/
    Stage.ts          // Stage interface + map/window/filter constructors  (@import-as-namespace)
    Pipeline.ts       // Pipeline.run + RunOptions + Sink type             (@import-as-namespace)
    index.ts          // barrel: export * as Stage / Pipeline
    testing/
      index.ts        // captureSink + scripted source helper (imports Pipeline.Sink)
    Pipeline.test.ts
    Stage.test.ts
```

`Sink` lives in `Pipeline.ts` (used only by `Pipeline.run`), surfaced as the `Pipeline.Sink` type;
`index.ts` is a pure namespace barrel (`export * as Stage` / `export * as Pipeline`).

Namespace-export convention per repo guidelines (`export * as Stage`, `export * as Pipeline`).

**Dependencies:** runtime — `effect` (catalog, peer) only; `dependencies` is empty. Dev/test —
`@dxos/effect` (workspace) for `EffectEx.runPromise` (the repo lint rule `no-effect-run-promise`
bans bare `Effect.runPromise`; `@dxos/effect` is dev-only so the published bundle stays
`effect`-only) plus `vitest`. No `@dxos/*` **runtime** dependency; no `@dxos/types`.

No `ContentBlock` helper entrypoint in this package for now: because `In` is fully generic and can
be any union (including transcription's `Block | Silence | Tick`), transcription-specific
conveniences belong in `@dxos/transcription-pipeline` when/if it is ported — not here. This keeps
`@dxos/pipeline` free of `@dxos/types`. (Revisit only if a second consumer wants the same helper.)

## How Transcription Maps Onto It

Illustrative, to validate the surface is sufficient (not built in this change):

- `Ctx` = `{ lookup?: EntityLookup; model?: DXN }` — supplied by the transcription package.
- `In` = `Block | Silence | Tick` union — the generic item; no trigger vocabulary in the core.
- `correct` = `Stage.window('correct', N, correctFn)` emitting a block-patch `Out`.
- `extract` = `Stage.window('extract', 8, extractFn)` using `ctx.lookup`.
- `summarize` = a `Stage.filter` for `Silence` events feeding `Stage.window('summarize', N, ...)`,
  configured with per-stage `overflow: 'sliding'`.
- `Out` = the existing `StageWrite` shape (block/transcript patches); `sink` = the existing ECHO
  commit. In-memory `captureSink()` covers tests.

## Error Handling

- Errors are typed in the stream error channel `E` (no untyped `Error`; per repo Effect rules). A
  stage that can fail declares its domain error; `Pipeline.run` propagates `E` to the caller, who
  chooses recovery (`Effect.catchTag`). A per-stage `Stream.catchAll`/`Stream.orElse` is the
  author's tool for "log and continue" — the core does not silently swallow failures.
- Cancellation is structural: interrupting the `Pipeline.run` effect interrupts the stream and
  its in-flight `mapEffect` work; there are no daemon fibers to leak.

## Testing

- **`Stage.test.ts`** — `map` (ordering at concurrency 1; parallelism at n>1), `window`
  (correct rolling slices incl. warm-up before `size` items; bounded memory), `filter`.
- **`Pipeline.test.ts`** — end-to-end with a scripted source and `captureSink`: chaining, context
  propagation, `undefined` no-op skipping, and each overflow strategy (`suspend` back-pressures a
  slow sink and loses nothing; `sliding` keeps the latest under overload). Prefer a single
  `TestLayer`; use `TestClock`/events over sleeps where timing is asserted.
- Public-API level only (constructors + `Pipeline.run`), no reaching into internals.

## Addendum — Parquet source (2026-07-02)

A concrete pipeline **source** over a small set of parquet files, for feeding real data to a
pipeline (transcription fixtures, prototyping, tests).

- **Placement:** `src/testing/parquet.ts`, exported from the `@dxos/pipeline/testing` entrypoint.
  `hyparquet` (pure-JS, isomorphic, neutral-safe) is a package **dependency** — imported only by the
  `./testing` entrypoint, so the core `.` entrypoint stays effect-only in its imports.
  `hyparquet-writer` is a **devDependency** used only to generate fixtures in tests (no committed
  binary blobs).
- **API:** `parquetSource(files: readonly string[]): Stream.Stream<ParquetRow, ParquetReadError>`
  where `ParquetRow = Record<string, unknown>`. Errors surface in the stream's `E` channel as a
  `ParquetReadError` (`Data.TaggedError`, carrying the offending `file`) — no untyped `Error`.
- **Read strategy (lazy):** files are read in order (`Stream.flatMap(..., { concurrency: 1 })`);
  within a file, an fs-backed `AsyncBuffer` slices byte ranges on demand and rows are emitted one
  **row group** at a time (`metadata.row_groups` → absolute `[rowStart, rowEnd)` → `parquetReadObjects`
  → `Stream.flattenIterables`). Decoded-row memory is bounded by the largest row group, not total
  rows; the file handle's lifetime is scoped to the stream via `Stream.unwrapScoped` +
  `Effect.acquireRelease`. Only hyparquet's isomorphic core (`parquetMetadataAsync`,
  `parquetReadObjects`) is imported — not its node file reader — so the neutral build is unaffected;
  the node `fs` handle is opened directly (static `node:fs/promises`, as sibling neutral packages do).
  Using `node:fs` under the neutral build requires `@dxos/node-std` as a workspace dependency (the
  build-time node-external shim, per sibling `functions-runtime`) — it is a platform shim, not a DXOS
  domain coupling, is never imported in source, and the tree-shaken `.` entrypoint does not pull it,
  so the core stays free of DXOS/ECHO coupling.
- **Usage:** `Pipeline.run({ source: parquetSource(['a.parquet', 'b.parquet']), stages, sink, context })`.

## Decisions (resolved with user)

1. **Item typing:** generic core `<In>`; a `ContentBlock` helper is deferred (no second consumer
   yet) rather than shipped speculatively.
2. **Write model:** keep the write-description + `Sink` seam (`Out` generalizes `StageWrite`).
3. **Runtime:** Effect + `Stream`.
4. **Overflow (1b):** configurable per-pipeline with per-stage override — `suspend` (email, no
   drop) vs `sliding` (transcription, drop-ok) vs `dropping`.
5. **Windowing (2):** in core, for the reasons documented above.

```

```
