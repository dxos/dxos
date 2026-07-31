//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { type StateError } from './errors';
import { Source } from './Source';
import { StateStore } from './StateStore';
import type * as Type from './types';

/** Durable outcome of a drained (or paused) crawl, read back from the {@link StateStore}. */
export type Summary = {
  /** True when no pending/active target remains. */
  readonly done: boolean;
  /** Targets skipped because a fetch failed (e.g. a 403 on an inaccessible channel). */
  readonly errored: number;
};

export type StreamOptions = {
  /** End the stream after this many advance steps; the run resumes from the durable state. */
  readonly maxSteps?: number;
  /** Incremented once per advance step (for run summaries). */
  readonly steps?: Ref.Ref<number>;
};

/**
 * In-run fetch positions, held in memory only. The DURABLE cursor/status advance exclusively
 * through {@link commit} (after events clear every pipeline stage), so a page that never cleared
 * the pipeline is refetched on resume rather than skipped.
 */
type Volatile = {
  readonly cursors: Map<string, string>;
  readonly done: Set<string>;
};

/** Top-most frontier target that is still actionable in THIS run. */
const pickTarget = (targets: readonly Type.Target[], volatile: Volatile): Type.Target | undefined => {
  for (let index = targets.length - 1; index >= 0; index--) {
    const target = targets[index];
    if (volatile.done.has(target.id)) {
      continue;
    }
    if (target.status === 'pending' || target.status === 'active') {
      return target;
    }
  }
  return undefined;
};

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
 * One bounded crawl step: fetch the next page for the top frontier target and return the events it
 * produces. `Option.none` when the frontier is exhausted for this run. Durable writes here are
 * limited to lifecycle bookkeeping that is safe at fetch time (pending→active, fetch-error, thread
 * discovery — all idempotent); cursor advancement and terminal `done` status belong to {@link commit}.
 */
const advance = (
  config: Type.Config,
  volatile: Volatile,
): Effect.Effect<Option.Option<Chunk.Chunk<Type.Event>>, StateError, Source | StateStore> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const source = yield* Source;

    const target = pickTarget(yield* store.listTargets(), volatile);
    if (!target) {
      return Option.none();
    }

    const events: Type.Event[] = [];
    const current: Type.Target = target.status === 'pending' ? { ...target, status: 'active' } : target;

    // First touch: open the channel/thread before reading its messages.
    if (target.status === 'pending') {
      yield* store.setStatus(target.id, 'active');
      events.push(
        target.threadId
          ? { _tag: 'ThreadStart', target: current, parentMessageId: target.parentMessageId }
          : { _tag: 'ChannelStart', target: current },
      );
    }

    // A source fetch can fail (typed error) OR die (defect — e.g. dfx/proxy surfacing a 403 as a
    // throw). Either way it is isolated to this target: mark it errored and continue with the rest
    // of the frontier rather than aborting the whole crawl.
    const fetched = yield* Effect.exit(
      source.fetchMessages({
        channelId: target.channelId,
        threadId: target.threadId,
        cursor: volatile.cursors.get(target.id) ?? target.cursor,
        maxDays: config.seed?.maxDays,
      }),
    );
    if (Exit.isFailure(fetched)) {
      const error = Cause.squash(fetched.cause);
      const reason = error instanceof Error ? error.message : String(error);
      yield* Effect.logWarning(`crawl: skipping ${target.id} — ${reason}`);
      yield* store.setStatus(target.id, 'error', reason);
      volatile.done.add(target.id);
      return Option.some(Chunk.fromIterable(events));
    }
    const page = fetched.value;

    for (const message of page.messages) {
      events.push({ _tag: 'Message', target: current, message });
    }

    // Push discovered threads on top of the frontier ⇒ they are drained before this target resumes.
    // Idempotent (existing ids are ignored), so safe at fetch time.
    if (config.descendThreads && target.depth < (config.maxDepth ?? Number.POSITIVE_INFINITY)) {
      yield* store.pushTargets(
        page.threads.map((thread) => ({
          id: thread.threadId,
          channelId: thread.threadId,
          threadId: thread.threadId,
          parentMessageId: thread.parentMessageId,
          depth: target.depth + 1,
          status: 'pending' as const,
        })),
      );
    }

    const drained = page.messages.length === 0;
    if (!drained && page.cursor) {
      volatile.cursors.set(target.id, page.cursor);
    }
    if (drained) {
      volatile.done.add(target.id);
      const closed: Type.Target = { ...current, status: 'done' };
      events.push(target.threadId ? { _tag: 'ThreadEnd', target: closed } : { _tag: 'ChannelEnd', target: closed });
    }
    return Option.some(Chunk.fromIterable(events));
  });

/**
 * The crawl as a pull-based stream of typed events. All resumable state lives in the
 * {@link StateStore}; interrupting the stream (or hitting `maxSteps`) is safe — a later stream over
 * the same store refetches from the last COMMITTED cursor (see {@link commit}). Compose with
 * `@dxos/pipeline` stages and drain with `Pipeline.run({ sink: Crawler.commit })`.
 */
export const stream = (
  config: Type.Config,
  options: StreamOptions = {},
): Stream.Stream<Type.Event, StateError, Source | StateStore> =>
  Stream.unwrap(
    Effect.gen(function* () {
      yield* seedFrontier(config);
      const volatile: Volatile = { cursors: new Map(), done: new Set() };
      const maxSteps = options.maxSteps ?? Number.POSITIVE_INFINITY;
      let taken = 0;
      return Stream.repeatEffectChunkOption(
        Effect.gen(function* () {
          if (taken >= maxSteps) {
            return yield* Effect.fail(Option.none<StateError>());
          }
          const step = yield* advance(config, volatile).pipe(Effect.mapError(Option.some));
          if (Option.isNone(step)) {
            return yield* Effect.fail(Option.none<StateError>());
          }
          taken++;
          if (options.steps) {
            yield* Ref.update(options.steps, (count) => count + 1);
          }
          return step.value;
        }),
      );
    }),
  );

/**
 * The terminal commit sink: only an event that cleared every stage moves durable state. `Message`
 * advances the target's cursor to the message's own id (snowflakes are monotonic); `ThreadEnd` /
 * `ChannelEnd` writes the terminal `done` status. An interrupt between fetch and sink therefore
 * re-fetches rather than skips.
 */
export const commit = (event: Type.Event): Effect.Effect<void, StateError, StateStore> =>
  Effect.flatMap(StateStore, (store) => {
    switch (event._tag) {
      case 'Message':
        return store.setCursor(event.target.id, event.message.id);
      case 'ThreadEnd':
      case 'ChannelEnd':
        return store.setStatus(event.target.id, 'done');
      default:
        return Effect.void;
    }
  });

/** Read the durable outcome back from the {@link StateStore} after a drain (or pause). */
export const summarize = (): Effect.Effect<Summary, StateError, StateStore> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const targets = yield* store.listTargets();
    return {
      done: !targets.some((target) => target.status === 'pending' || target.status === 'active'),
      errored: targets.filter((target) => target.status === 'error').length,
    };
  });
