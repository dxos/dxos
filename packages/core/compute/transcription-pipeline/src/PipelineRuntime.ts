//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { type ModelName } from '@dxos/ai';
import { log } from '@dxos/log';
import { type ContentBlock } from '@dxos/types';

import { type EntityLookup } from './lookup';
import { resolveModel } from './model-routing';
import { type StageConfig } from './PipelineConfig';
import { type Stage, type StageContext, type StageWrite } from './Stage';
import { type TranscriptEvent } from './TranscriptEvent';

/** Upper bound on retained blocks; bounds memory for long sessions (stages slice their own window). */
const MAX_WINDOW = 128;

/**
 * Commits a stage's output to storage. Receives the exact window slice the stage was invoked with,
 * so `BlockUpdate.index` can be resolved against the originating blocks.
 */
export type CommitFn = (write: StageWrite, window: readonly ContentBlock.Transcript[]) => Effect.Effect<void>;

export type StageOutcome = 'committed' | 'interrupted' | 'skipped' | 'error';

export type TelemetryEvent = {
  readonly stageId: string;
  readonly model: ModelName;
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
  readonly presetDefault?: ModelName;
  /** Optional telemetry sink (drives the testbench). */
  readonly onTelemetry?: (event: TelemetryEvent) => void;
};

const triggerMatches = (stage: Stage<any, any>, kind: TranscriptEvent['kind']): boolean =>
  (stage.trigger === 'per-block' && kind === 'block') ||
  (stage.trigger === 'on-silence' && kind === 'silence') ||
  (stage.trigger === 'periodic' && kind === 'tick');

/**
 * Consume the event stream, slice it into windows, and drive each stage's discrete invocations with
 * per-stage trigger / window / concurrency / model. Resolves once the source ends and all in-flight
 * stage invocations have drained.
 */
const run = (options: RunOptions): Effect.Effect<void> =>
  Effect.gen(function* () {
    const { source, stages, commit, lookup, configs, presetDefault, onTelemetry } = options;

    const windowRef = yield* Ref.make<ContentBlock.Transcript[]>([]);
    const fibers = yield* Ref.make(new Map<string, Fiber.RuntimeFiber<void, never>>());
    const busy = yield* Ref.make(new Set<string>());

    const configFor = (id: string): StageConfig | undefined => configs?.find((config) => config.id === id);
    const isEnabled = (stage: Stage<any, any>): boolean => configFor(stage.id)?.enabled ?? true;
    const sliceFor = (stage: Stage<any, any>, window: ContentBlock.Transcript[]): ContentBlock.Transcript[] => {
      const blocks = configFor(stage.id)?.window?.blocks ?? stage.window?.blocks;
      return blocks ? window.slice(-blocks) : window;
    };

    const runStage = (stage: Stage<any, any>, kind: TranscriptEvent['kind']): Effect.Effect<void, never> =>
      Effect.gen(function* () {
        const window = yield* Ref.get(windowRef);
        const slice = sliceFor(stage, window);
        const model = resolveModel(configFor(stage.id), stage, presetDefault);
        const input = stage.select ? stage.select(slice) : { window: slice };
        const context: StageContext = { lookup, model };
        const started = yield* Effect.sync(() => Date.now());
        const write = yield* stage.run(input, context);
        yield* commit(write, slice);
        const durationMs = (yield* Effect.sync(() => Date.now())) - started;
        onTelemetry?.({ stageId: stage.id, model, trigger: kind, durationMs, outcome: 'committed' });
      }).pipe(
        Effect.catchAllCause((cause) =>
          Effect.sync(() => {
            // Latest-wins interruption is expected; surface only genuine failures.
            if (!Cause.isInterruptedOnly(cause)) {
              log.catch(Cause.squash(cause));
              const model = resolveModel(configFor(stage.id), stage, presetDefault);
              onTelemetry?.({ stageId: stage.id, model, trigger: kind, durationMs: 0, outcome: 'error' });
            }
          }),
        ),
        Effect.ensuring(Ref.update(busy, (set) => removeFrom(set, stage.id))),
      );

    const dispatch = (stage: Stage<any, any>, kind: TranscriptEvent['kind']): Effect.Effect<void> =>
      Effect.gen(function* () {
        const isBusy = (yield* Ref.get(busy)).has(stage.id);
        if (isBusy) {
          if (stage.concurrency === 'skip-if-busy') {
            const model = resolveModel(configFor(stage.id), stage, presetDefault);
            onTelemetry?.({ stageId: stage.id, model, trigger: kind, durationMs: 0, outcome: 'skipped' });
            return;
          }
          const existing = (yield* Ref.get(fibers)).get(stage.id);
          if (existing) {
            const model = resolveModel(configFor(stage.id), stage, presetDefault);
            onTelemetry?.({ stageId: stage.id, model, trigger: kind, durationMs: 0, outcome: 'interrupted' });
            yield* Fiber.interrupt(existing);
          }
        }
        yield* Ref.update(busy, (set) => new Set(set).add(stage.id));
        // forkDaemon (not fork): stage work outlives the Stream.runForEach element scope, so an async
        // stage (e.g. an entity-lookup query) is not interrupted when the triggering event is consumed.
        // The runtime owns these fibers explicitly — latest-wins interrupts them; drain awaits them.
        const fiber = yield* Effect.forkDaemon(runStage(stage, kind));
        yield* Ref.update(fibers, (map) => new Map(map).set(stage.id, fiber));
      });

    const handle = (event: TranscriptEvent): Effect.Effect<void> =>
      Effect.gen(function* () {
        if (event.kind === 'block') {
          yield* Ref.update(windowRef, (window) => [...window, event.block].slice(-MAX_WINDOW));
        }
        for (const stage of stages) {
          if (isEnabled(stage) && triggerMatches(stage, event.kind)) {
            yield* dispatch(stage, event.kind);
          }
        }
      });

    // Interrupt any outstanding daemon fibers if the run fails or is interrupted, so stage work
    // (and its writes) cannot continue after the pipeline has ended on an abnormal exit path.
    const interruptRemaining = Effect.gen(function* () {
      const outstanding = yield* Ref.get(fibers);
      yield* Effect.forEach([...outstanding.values()], (fiber) => Fiber.interrupt(fiber), { discard: true });
    });
    yield* Stream.runForEach(source, handle).pipe(
      Effect.onError(() => interruptRemaining),
      Effect.onInterrupt(() => interruptRemaining),
    );

    // Normal completion: drain in-flight invocations triggered near the end of the stream. `await`
    // (not `join`) so a fiber that ended via latest-wins interruption does not re-raise.
    const remaining = yield* Ref.get(fibers);
    yield* Effect.forEach([...remaining.values()], (fiber) => Fiber.await(fiber), { discard: true });
  });

const removeFrom = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

export const PipelineRuntime = Object.freeze({ run });
