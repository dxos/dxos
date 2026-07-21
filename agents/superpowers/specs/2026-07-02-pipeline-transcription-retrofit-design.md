# Retrofit @dxos/pipeline into transcription-pipeline + rename — Design

**Date:** 2026-07-02
**Status:** Awaiting approval
**Author:** rich@braneframe.com (with Claude)

## Goals

1. Rename `@dxos/transcription-pipeline` → `@dxos/pipeline-transcription` (directory + package name + all
   importers + moon/tsconfig), in the **same** change as the retrofit.
2. Replace the bespoke `PipelineRuntime` with an orchestrator built on `@dxos/pipeline`, reusing its
   `Stage`/`Sink`/overflow/`Pipeline.run` machinery instead of hand-rolled fibers.

## Non-Goals

- Changing the package's **public API**: `Stage` (the transcription stage descriptor), `StageWrite`,
  `CommitFn`, `TranscriptEvent`, `EntityLookup`/`makeDatabaseLookup`, `PipelineConfig`, the ASR layer
  (`Transcriber`, `runAsrPipeline`, …), and the `stages/` implementations stay as-is. Consumers
  (`react-ui-transcription`, `plugin-transcription`) recompile unchanged except for the import path.
- Adding fan-out to `@dxos/pipeline` (decided: broadcast lives in transcription).

## Topology (decided): broadcast, no fan-out in core

Transcription fans one `TranscriptEvent` stream out to N peer stages. We express this at the
transcription layer with Effect `Stream.broadcast`, running **one `Pipeline.run` per stage** over a
broadcast branch, all writing to one shared `Sink`:

```
source: Stream<TranscriptEvent>
  → Stream.broadcast(N)  ──▶ branch₁ → Pipeline.run({ stages: [compile(stage₁)], sink, overflow₁ })
                          ├▶ branch₂ → Pipeline.run({ stages: [compile(stage₂)], sink, overflow₂ })
                          └▶ branchN → Pipeline.run({ stages: [compile(stageₙ)], sink, overflowₙ })
  (all branches run concurrently; the orchestrator awaits all — drain on source end)
```

### Compiling a transcription stage → a `@dxos/pipeline` pipeline

Each transcription `Stage` descriptor (`{ id, trigger, window?, concurrency, model?, select?, run }`)
compiles to a two-stage `@dxos/pipeline` chain over its broadcast branch:

1. **`windowTrigger(descriptor)`** — a custom `Stage.Stage<TranscriptEvent, Slice | undefined, Ctx>`
   built with `Stream.mapAccum`: it maintains this branch's own rolling block window (appending on
   `block` events, capped at `MAX_WINDOW`), and on an event whose kind matches `descriptor.trigger`
   it emits the window **slice** (`sliceFor(descriptor, window)`); on every other event it emits
   `undefined`. (Per-branch window = the original per-stage `sliceFor` behavior; no shared mutable
   `windowRef` needed.)
2. **`Stage.map(runFn, { overflow })`** — `@dxos/pipeline`'s own `map`. `undefined` slices are dropped
   _between stages_ (the undefined-skip we added), so `runFn` fires only on trigger events. `runFn`
   invokes `descriptor.run(input, ctx)` and pairs the result with the slice it ran against:
   `runFn = (slice, ctx) => descriptor.run(descriptor.select?.(slice) ?? { window: slice }, ctx)
.pipe(Effect.map((write) => ({ write, window: slice })))`.

The shared **`Sink`** is `({ write, window }, ctx) => commit(write, window)` — wrapping the existing
`CommitFn`, which needs the slice to resolve `BlockUpdate.index`. `Ctx = { lookup?, model }`
(replacing `StageContext`); the resolved model per stage is computed by the orchestrator
(`resolveModel`) and injected into the branch's context.

### Trigger and concurrency mapping

- **Trigger** (`per-block`/`on-silence`/`periodic`) → the `windowTrigger` stage's kind check
  (`triggerMatches`), replacing the runtime's per-event dispatch loop.
- **Concurrency** → per-stage `overflow` on the `Stage.map`:
  - `latest-wins` → **`sliding`** (buffer capacity 1: while a run is in flight, newer slices replace
    the queued one; the next run processes the latest, older queued slices dropped).
  - `skip-if-busy` → **`dropping`** (while a run is in flight, new slices are dropped, letting the
    current run finish).

## Behavioral caveat (needs sign-off)

The original `latest-wins` **interrupts the in-flight fiber** (`Fiber.interrupt`) so a stale
invocation's write never lands. The `sliding`-buffer approximation does **not** interrupt: the
in-flight run completes and commits, then the latest queued slice runs. For the transcription stages
this is benign — `correct`/`extract` are idempotent over the window (a later run overwrites an
earlier one) and `summarize` is `skip-if-busy` — but it is a real semantic change: intermediate
commits can occur that the original would have interrupted away.

**Options if exact interruption is required:** implement the run stage with a switching operator
(interrupt-and-restart on each new slice) instead of a buffer. This is more complex and not a
`@dxos/pipeline` primitive; it would live in the transcription `windowTrigger`/run compilation.
**Recommendation:** accept the `sliding`/`dropping` approximation (matches the intent; simpler;
idempotent stages tolerate it), and document it.

**DECIDED:** accept the `sliding` (latest-wins) / `dropping` (skip-if-busy) approximation — no fiber
interruption. Documented as a behavior change on the renamed package.

## Rename

- Directory `packages/core/compute/transcription-pipeline` → `packages/core/compute/pipeline-transcription`.
- `package.json` name `@dxos/transcription-pipeline` → `@dxos/pipeline-transcription`.
- Update all 9 importer files in `react-ui-transcription` + `plugin-transcription` (`.ts` imports +
  their `package.json` dependency entries) to the new name.
- Update moon/tsconfig project references; regenerate `tsconfig.all.json`/`release-please-config.json`
  via the postinstall toolbox (`pnpm install`).
- Add `@dxos/pipeline` as a `workspace:*` dependency of the renamed package.

## Testing

- The package's existing suites (`PipelineRuntime.test.ts` → the new orchestrator, `dispatch.test.ts`,
  `pipeline-integration.test.ts`, stage tests, `live.test.ts`) must stay green. The runtime test
  asserts observable behavior (per-block correction, on-silence summary, latest-wins produces the
  final result) — it should pass against the new orchestrator with, at most, the interruption-count
  telemetry assertion adjusted for the buffer semantics (the `latest-wins interrupts` test asserts an
  `interrupted` telemetry event; under the buffer model that specific signal changes — see caveat).
- Consumer packages (`react-ui-transcription`, `plugin-transcription`) build green after the rename.
- Full `moon run :build` / `:test` / `:lint` on the affected projects.

## Risks

- **DECIDED:** telemetry keeps `committed`/`error` outcomes and drops `interrupted`/`skipped` (no
  fiber-level signal under overflow). `StageOutcome` narrows to `'committed' | 'error'`; testbench and
  the `latest-wins interrupts` test are adjusted accordingly.
- `Stream.broadcast` scoping: branches must be consumed concurrently within one scope; the orchestrator
  owns that scope and awaits all branches so the run drains on source end (matching the old
  `Fiber.await` drain).
