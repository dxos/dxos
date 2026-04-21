//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';

import { Database, Feed, Filter, Order, Query } from '@dxos/echo';
import { ServiceResolver, Trace } from '@dxos/functions';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export const TRACE_FEED_KIND = 'dxos.org.feed.trace';

// In-rare cases its possible to have multiple trace feeds, natural order ensures that all clients use the same feed.
export const query = Query.select(Filter.type(Feed.Feed, { kind: TRACE_FEED_KIND })).orderBy(Order.natural);
// TODO(dmaretskyi): limit(1) is broken - query returns empty array.
// .limit(1);

/**
 * Per-space trace feed service.
 *
 * Exposes a {@link Trace.Sink} bound to the space's trace feed plus a manual
 * `flush` helper that waits until every buffered message has been appended.
 * The sink is provided as a field (rather than having the service *be* the
 * sink) so the higher-level routing sink can dispatch messages synchronously.
 */
export class FeedTraceSink extends Context.Tag('@dxos/functions-runtime/FeedTraceSink')<
  FeedTraceSink,
  {
    readonly sink: Trace.Sink;
    readonly flush: () => Effect.Effect<void>;
  }
>() {}

/**
 * Layer that resolves a space's trace feed, wires up a buffered flushing
 * writer, and exposes it as {@link FeedTraceSink}. Requires ambient
 * {@link Database.Service} and {@link Feed.FeedService} (per-space).
 */
export const layerLive: Layer.Layer<FeedTraceSink, never, Database.Service | Feed.FeedService> = Layer.scopedContext(
  Effect.gen(function* () {
    const feed = yield* getOrCreateTraceFeed();

    const runtime = yield* Effect.runtime<Feed.FeedService>();
    let buffer: Trace.Message[] = [];
    let flushMore = false;
    let flushFiber: Fiber.RuntimeFiber<void> | undefined;

    const scheduleFlush = () => {
      flushMore = true;
      if (!flushFiber) {
        runFlush();
      }
    };

    const runFlush = () => {
      flushFiber = Effect.gen(function* () {
        while (flushMore) {
          flushMore = false;
          const messages = buffer;
          buffer = [];
          if (messages.length > 0) {
            yield* Feed.append(feed, messages);
          }
        }
        flushFiber = undefined;
      }).pipe(Effect.provide(runtime), Effect.runFork);
    };

    const flushNow = () =>
      Effect.gen(function* () {
        if (flushFiber) {
          yield* Fiber.await(flushFiber);
        }
        const messages = buffer;
        buffer = [];
        if (messages.length > 0) {
          yield* Feed.append(feed, messages);
        }
      }).pipe(Effect.provide(runtime));

    yield* Effect.addFinalizer(() => flushNow());

    return FeedTraceSink.context({
      sink: {
        write: (message) => {
          log('write trace message', { message });
          buffer.push(message);
          scheduleFlush();
        },
      },
      flush: () => flushNow(),
    });
  }),
);

/**
 * Adapter layer that installs {@link FeedTraceSink.sink} as the ambient
 * {@link Trace.TraceSink}. Useful for tests and single-space contexts that
 * don't go through the process-manager routing sink.
 */
export const layerDirect: Layer.Layer<Trace.TraceSink, never, FeedTraceSink> = Layer.effect(
  Trace.TraceSink,
  Effect.map(FeedTraceSink, (_) => _.sink),
);

/**
 * Convenience that combines {@link layerLive} and {@link layerDirect} — the
 * pre-refactor shape of `layerLive` (provides both services).
 */
export const layerLiveWithDirectSink: Layer.Layer<
  Trace.TraceSink | FeedTraceSink,
  never,
  Database.Service | Feed.FeedService
> = layerDirect.pipe(Layer.provideMerge(layerLive));

export const getOrCreateTraceFeed = Effect.fn('getOrCreateTraceFeed')(function* () {
  const feeds = yield* Database.runQuery(query);
  if (feeds.length > 0) {
    return feeds[0];
  }
  return yield* Database.add(Feed.make({ kind: TRACE_FEED_KIND, name: 'Execution Trace', namespace: 'trace' }));
});

/**
 * Flush pending trace events to the trace feed.
 */
export const flush = Effect.serviceFunctionEffect(FeedTraceSink, (_) => _.flush);

/**
 * Noop layer that satisfies the FeedTraceSink service without persisting anything.
 */
export const layerNoop: Layer.Layer<FeedTraceSink> = Layer.succeed(FeedTraceSink, {
  sink: Trace.noopSink,
  flush: () => Effect.void,
});

/**
 * Build a {@link Trace.Sink} that routes incoming messages to the
 * {@link FeedTraceSink} for the space identified by `message.meta.space`.
 *
 * Resolution is lazy and cached per space. Messages that arrive before the
 * first resolution completes are buffered and replayed. Messages without a
 * `space` are dropped with a warning.
 *
 * This sink is the application-level entry point used by the process-manager
 * runtime; the per-space sinks it resolves handle the actual feed writes.
 */
export const makeRoutingSink = (opts: { resolver: ServiceResolver.ServiceResolver }): Trace.Sink => {
  type Entry =
    | { status: 'pending'; buffer: Trace.Message[] }
    | { status: 'ready'; sink: Trace.Sink }
    | { status: 'error' };

  const perSpace = new Map<string, Entry>();

  const resolveSink = (space: string) => {
    if (!SpaceId.isValid(space)) {
      log.warn('[feed-trace] trace message carries an invalid space id', { space });
      perSpace.set(space, { status: 'error' });
      return;
    }
    const effect = opts.resolver.resolve(FeedTraceSink, { space }).pipe(Effect.scoped);
    Effect.runPromise(effect).then(
      (service) => {
        const entry = perSpace.get(space);
        perSpace.set(space, { status: 'ready', sink: service.sink });
        if (entry?.status === 'pending') {
          for (const buffered of entry.buffer) {
            try {
              service.sink.write(buffered);
            } catch (err) {
              log.warn('[feed-trace] sink write failed during drain', { err });
            }
          }
        }
      },
      (err) => {
        log.warn('[feed-trace] could not resolve FeedTraceSink for space', { space, err });
        perSpace.set(space, { status: 'error' });
      },
    );
  };

  return {
    write: (message) => {
      const space = message.meta.space;
      if (!space) {
        log('dropping trace message with no space id', { message });
        return;
      }
      const entry = perSpace.get(space);
      if (!entry) {
        perSpace.set(space, { status: 'pending', buffer: [message] });
        resolveSink(space);
        return;
      }
      switch (entry.status) {
        case 'pending':
          entry.buffer.push(message);
          return;
        case 'ready':
          entry.sink.write(message);
          return;
        case 'error':
          return;
      }
    },
  };
};
