//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Stream from 'effect/Stream';

import { DXN } from '@dxos/echo';
import { log } from '@dxos/log';
import { Pipeline, Stage as PipelineStage } from '@dxos/pipeline';
import { type ContentBlock } from '@dxos/types';

import { type EntityLookup } from './lookup';
import { resolveModel } from './model-routing';
import { type StageConfig } from './PipelineConfig';
import { type Stage, type StageContext, type StageWrite } from './Stage';
import { type TranscriptEvent } from './TranscriptEvent';

/** Upper bound on retained blocks; bounds memory for long sessions (stages slice their own window). */
const MAX_WINDOW = 128;

/** Backpressure lag (in chunks) the broadcast driver may run ahead of the slowest branch. */
const BROADCAST_BUFFER = 128;

/**
 * Commits a stage's output to storage. Receives the exact window slice the stage was invoked with,
 * so `BlockUpdate.index` can be resolved against the originating blocks.
 */
export type CommitFn = (write: StageWrite, window: readonly ContentBlock.Transcript[]) => Effect.Effect<void>;

/**
 * Outcome reported per stage invocation. The `sliding`/`dropping` overflow model has no fiber-level
 * signal for stale work, so only `committed` and `error` are reported (the previous fiber-based
 * runtime also surfaced `interrupted`/`skipped`).
 */
export type StageOutcome = 'committed' | 'error';

export type TelemetryEvent = {
  readonly stageId: string;
  readonly model: DXN.DXN;
  readonly trigger: TranscriptEvent['kind'];
  readonly durationMs: number;
  readonly outcome: StageOutcome;
};

export type RunOptions = {
  /** The continuous transcript event stream (ASR source or a scripted fixture). */
  readonly source: Stream.Stream<TranscriptEvent>;
  /** Ordered stages to run. */
  readonly stages: readonly Stage<any, any>[];
  /** Sink for stage outputs (in-memory capture in tests; ECHO dispatcher in production). */
  readonly commit: CommitFn;
  /** Entity-reference resolver injected into each stage context (backend-agnostic). */
  readonly lookup?: EntityLookup;
  /** Per-stage configuration (enabled / model / window). Absent → stage runs with its defaults. */
  readonly configs?: readonly StageConfig[];
  /** Default model when neither config nor stage specifies one. */
  readonly presetDefault?: DXN.DXN;
  /** Optional telemetry sink (drives the testbench). */
  readonly onTelemetry?: (event: TelemetryEvent) => void;
};

/** A window slice a stage is invoked over; the commit resolves `BlockUpdate.index` against it. */
type Slice = ContentBlock.Transcript[];

/** A stage invocation's output paired with the slice it ran over (needed by {@link CommitFn}). */
type Enriched = { readonly write: StageWrite; readonly window: Slice };

/**
 * Private bridge between this module's plain `StageContext` object and `@dxos/pipeline`'s
 * Requirements-based `Stage`. Not part of any public contract: stage authors (see `Stage.ts`) keep
 * receiving `ctx: StageContext` as an explicit parameter; only this module's internal wiring into
 * `@dxos/pipeline` goes through Effect's Context/Layer mechanism.
 */
class StageContextService extends Context.Tag('@dxos/pipeline-transcription/StageContextService')<
  StageContextService,
  StageContext
>() {}

const triggerMatches = (stage: Stage<any, any>, kind: TranscriptEvent['kind']): boolean =>
  (stage.trigger === 'per-block' && kind === 'block') ||
  (stage.trigger === 'on-silence' && kind === 'silence') ||
  (stage.trigger === 'periodic' && kind === 'tick');

const triggerKind = (stage: Stage<any, any>): TranscriptEvent['kind'] =>
  stage.trigger === 'per-block' ? 'block' : stage.trigger === 'on-silence' ? 'silence' : 'tick';

/**
 * Per-stage window + trigger, as a `@dxos/pipeline` stage. Maintains this branch's own rolling block
 * window (blocks appended, capped at {@link MAX_WINDOW}) and emits the window slice on events matching
 * the stage's trigger; otherwise it filters the item out, so a non-triggering event never reaches
 * {@link runStage}.
 */
const windowTrigger = (
  stage: Stage<any, any>,
  config: StageConfig | undefined,
): PipelineStage.Stage<TranscriptEvent, Slice> => {
  const blocks = config?.window?.blocks ?? stage.window?.blocks;
  return (input) =>
    input.pipe(
      Stream.mapAccum([] as Slice, (window, event) => {
        const next = event.kind === 'block' ? [...window, event.block].slice(-MAX_WINDOW) : window;
        const slice = triggerMatches(stage, event.kind) ? (blocks ? next.slice(-blocks) : next) : undefined;
        return [next, slice];
      }),
      Stream.filter((slice): slice is Slice => slice !== undefined),
    );
};

/**
 * Runs the stage over a triggered slice, pairing its write with that slice. Per-stage `overflow`
 * enforces concurrency: `latest-wins → sliding` (a newer slice replaces the queued one), `skip-if-busy
 * → dropping` (new slices dropped while a run is in flight). Neither interrupts the in-flight run —
 * errors are logged + reported and swallowed (emit `undefined` → no commit), as before.
 */
const runStage = (
  stage: Stage<any, any>,
  config: StageConfig | undefined,
  presetDefault: DXN.DXN | undefined,
  onTelemetry?: (event: TelemetryEvent) => void,
): PipelineStage.Stage<Slice, Enriched, never, StageContextService> => {
  const model = resolveModel(config, stage, presetDefault);
  const trigger = triggerKind(stage);
  return PipelineStage.map(
    stage.id,
    (slice: Slice) =>
      Effect.gen(function* () {
        const context = yield* StageContextService;
        const started = yield* Effect.sync(() => Date.now());
        const input = stage.select ? stage.select(slice) : { window: slice };
        const write = yield* stage.run(input, context);
        const durationMs = (yield* Effect.sync(() => Date.now())) - started;
        onTelemetry?.({ stageId: stage.id, model, trigger, durationMs, outcome: 'committed' });
        return { write, window: slice };
      }).pipe(
        Effect.catchAllCause((cause) =>
          Effect.sync(() => {
            log.catch(Cause.squash(cause));
            onTelemetry?.({ stageId: stage.id, model, trigger, durationMs: 0, outcome: 'error' });
            return undefined;
          }),
        ),
      ),
    { overflow: stage.concurrency === 'latest-wins' ? 'sliding' : 'dropping', bufferSize: 1 },
  );
};

/**
 * Drive each stage's discrete invocations off the event stream. Stages are peers, not a chain: the
 * event stream is broadcast to one `@dxos/pipeline` per enabled stage (each with its own window,
 * trigger, and overflow), all committing to a shared sink. Resolves once the source ends and every
 * branch has drained.
 */
const run = (options: RunOptions): Effect.Effect<void> =>
  Effect.scoped(
    Effect.gen(function* () {
      const { source, stages, commit, lookup, configs, presetDefault, onTelemetry } = options;
      const configFor = (id: string): StageConfig | undefined => configs?.find((config) => config.id === id);
      const enabled = stages.filter((stage) => configFor(stage.id)?.enabled ?? true);
      if (enabled.length === 0) {
        return yield* Stream.runDrain(source);
      }

      // Isolate commit failures per write: a failed commit must not fail its branch (which, under the
      // unbounded `Effect.forEach`, would interrupt the sibling branches). Log and drop instead.
      const sink: Pipeline.Sink<Enriched> = ({ write, window }) =>
        commit(write, window).pipe(Effect.catchAllCause((cause) => Effect.sync(() => log.catch(Cause.squash(cause)))));
      const branches = yield* source.pipe(Stream.broadcast(enabled.length, BROADCAST_BUFFER));

      yield* Effect.forEach(
        branches,
        (branch, index) => {
          const stage = enabled[index];
          const config = configFor(stage.id);
          const context: StageContext = { lookup, model: resolveModel(config, stage, presetDefault) };
          return pipe(
            branch,
            windowTrigger(stage, config),
            runStage(stage, config, presetDefault, onTelemetry),
            Pipeline.run({ sink }),
            Effect.provideService(StageContextService, context),
          );
        },
        { concurrency: 'unbounded', discard: true },
      );
    }),
  );

export const PipelineRuntime = Object.freeze({ run });
