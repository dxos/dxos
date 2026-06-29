//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type CrawlError, type StateError } from './errors';
import { Source } from './Source';
import { type Env, type Stage } from './Stage';
import { StateStore } from './StateStore';
import type * as Type from './types';

/** Result of one {@link advance} step. */
export type StepResult = { readonly _tag: 'more' } | { readonly _tag: 'done' };

/** Outcome of a {@link run} (or a bounded slice of one). */
export type RunSummary = {
  readonly steps: number;
  /** True if the frontier is fully drained; false if stopped at the step bound. */
  readonly done: boolean;
  /** Targets skipped because the source fetch failed (e.g. a 403 on an inaccessible channel). */
  readonly errored: number;
};

/** Dispatch one event to every stage that handles it; isolate per-stage failures on the target. */
const runStages = (stages: readonly Stage[], event: Type.Event): Effect.Effect<void, StateError, Env> =>
  Effect.forEach(
    stages.filter((stage) => stage.handles.includes(event._tag)),
    (stage) =>
      stage.apply(event).pipe(
        Effect.catchAll((error) =>
          Effect.flatMap(StateStore, (store) =>
            // A stage fault is recorded on the target but does not abort the crawl.
            store.setStatus(event.target.id, event.target.status, `${stage.name}: ${error.message}`),
          ),
        ),
      ),
    { discard: true },
  );

/**
 * Advance the crawl by one bounded unit: fetch the next page for the top frontier target, run its
 * events through the stages, persist the cursor/frontier, and report whether work remains. All
 * progress lives in the {@link StateStore}, so a caller may stop between steps and resume later.
 */
export const advance = (
  config: Type.Config,
  stages: readonly Stage[],
): Effect.Effect<StepResult, CrawlError | StateError, Source | StateStore | Env> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const source = yield* Source;

    const target = yield* store.nextActionable();
    if (!target) {
      return { _tag: 'done' as const };
    }

    // First touch: open the channel/thread before reading its messages.
    if (target.status === 'pending') {
      yield* store.setStatus(target.id, 'active');
      const opened: Type.Target = { ...target, status: 'active' };
      yield* runStages(
        stages,
        target.threadId
          ? { _tag: 'ThreadStart', target: opened, parentMessageId: target.parentMessageId ?? '' }
          : { _tag: 'ChannelStart', target: opened },
      );
    }

    // A source-fetch failure is isolated to this target: mark it errored and continue with the rest
    // of the frontier rather than aborting the whole crawl (e.g. a 403 on one inaccessible channel).
    const fetched = yield* Effect.either(
      source.fetchMessages({
        channelId: target.channelId,
        threadId: target.threadId,
        cursor: target.cursor,
        maxDays: config.seed?.maxDays,
      }),
    );
    if (fetched._tag === 'Left') {
      yield* Effect.logWarning(`crawl: skipping ${target.id} — ${fetched.left.message}`);
      yield* store.setStatus(target.id, 'error', fetched.left.message);
      const remaining = yield* store.hasActionable();
      return remaining ? { _tag: 'more' as const } : { _tag: 'done' as const };
    }
    const page = fetched.right;

    for (const message of page.messages) {
      yield* runStages(stages, { _tag: 'Message', target, message });
    }

    // Push discovered threads on top of the frontier ⇒ they are drained before this target resumes.
    if (config.descendThreads && target.depth < (config.maxDepth ?? Number.POSITIVE_INFINITY)) {
      const children: Type.Target[] = page.threads.map((thread) => ({
        id: thread.threadId,
        channelId: thread.threadId,
        threadId: thread.threadId,
        parentMessageId: thread.parentMessageId,
        depth: target.depth + 1,
        status: 'pending',
      }));
      yield* store.pushTargets(children);
    }

    const drained = page.messages.length === 0;
    if (!drained && page.cursor) {
      yield* store.setCursor(target.id, page.cursor);
    }
    if (drained) {
      yield* store.setStatus(target.id, 'done');
      const closed: Type.Target = { ...target, status: 'done' };
      yield* runStages(
        stages,
        target.threadId ? { _tag: 'ThreadEnd', target: closed } : { _tag: 'ChannelEnd', target: closed },
      );
    }

    const more = yield* store.hasActionable();
    return more ? { _tag: 'more' as const } : { _tag: 'done' as const };
  });

/** Seed the frontier with the configured top-level channels (idempotent — only when empty). */
const seedFrontier = (config: Type.Config): Effect.Effect<void, StateError, StateStore> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const existing = yield* store.listTargets();
    if (existing.length > 0) {
      return;
    }
    yield* store.pushTargets(
      config.channels.map((channelId) => ({ id: channelId, channelId, depth: 0, status: 'pending' as const })),
    );
  });

/**
 * Run the crawl to completion (or to `options.maxSteps`, leaving the run `paused` so a later call
 * resumes from the persisted frontier). Re-invoking over the same {@link StateStore} resumes.
 */
export const run = (
  config: Type.Config,
  stages: readonly Stage[],
  options?: { readonly maxSteps?: number },
): Effect.Effect<RunSummary, CrawlError | StateError, Source | StateStore | Env> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    yield* seedFrontier(config);
    yield* store.setRunStatus('running');

    const erroredCount = () =>
      store.listTargets().pipe(Effect.map((targets) => targets.filter((target) => target.status === 'error').length));

    const maxSteps = options?.maxSteps ?? Number.POSITIVE_INFINITY;
    let steps = 0;
    while (steps < maxSteps) {
      const result = yield* advance(config, stages);
      steps++;
      if (result._tag === 'done') {
        yield* store.setRunStatus('done');
        return { steps, done: true, errored: yield* erroredCount() };
      }
    }
    yield* store.setRunStatus('paused');
    return { steps, done: false, errored: yield* erroredCount() };
  });
