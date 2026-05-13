//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';

import { ServiceResolver, Trace } from '@dxos/compute';
import { Database, Feed, Filter, Order, Query } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

export const TRACE_FEED_KIND = 'dxos.org.feed.trace';

// In-rare cases its possible to have multiple trace feeds, natural order ensures that all clients use the same feed.
export const query = Query.select(Filter.type(Feed.Feed, { kind: TRACE_FEED_KIND })).orderBy(Order.natural);
// TODO(dmaretskyi): limit(1) is broken - query returns empty array.
// .limit(1);

export class FeedTraceSink extends Context.Tag('@dxos/functions-runtime/FeedTraceSink')<
  FeedTraceSink,
  {
    readonly sink: Trace.Sink;
    readonly flush: () => Effect.Effect<void>;
  }
>() {}

export const layerLive: Layer.Layer<Trace.TraceSink | FeedTraceSink, never, Database.Service | Feed.FeedService> =
  Layer.scopedContext(
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
              log('trace feed append batch', { count: messages.length, feedId: feed.id });
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
            log('trace feed append batch (flush now)', { count: messages.length, feedId: feed.id });
            yield* Feed.append(feed, messages);
          }
        }).pipe(Effect.provide(runtime));

      yield* Effect.addFinalizer(() => flushNow());

      const sink: Trace.Sink = {
        write: (message) => {
          log('trace message buffered', {
            feedId: feed.id,
            pid: message.meta.pid,
            isEphemeral: message.isEphemeral,
            eventTypes: message.events.map((event) => event.type),
          });
          buffer.push(message);
          scheduleFlush();
        },
      };

      return Context.mergeAll(
        Trace.TraceSink.context(sink),
        FeedTraceSink.context({
          sink,
          flush: () => flushNow(),
        }),
      );
    }),
  );

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
  sink: { write: () => {} },
  flush: () => Effect.void,
});

/**
 * Build a {@link Trace.Sink} that routes each message to the {@link FeedTraceSink}
 * for its space, resolved lazily via the supplied {@link ServiceResolver}.
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
    runAndForwardErrors(effect).then(
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
        log('dropping trace message with no space id', { id: message.id, pid: message.meta.pid });
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
