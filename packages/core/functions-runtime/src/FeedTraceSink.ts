//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Database, Feed, Filter, Order, Query } from '@dxos/echo';
import { Trace } from '@dxos/functions';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';

export const TRACE_FEED_KIND = 'dxos.org.feed.trace';

export const layerLive: Layer.Layer<Trace.TraceSink, never, Database.Service | Feed.Service> = Layer.effect(
  Trace.TraceSink,
  Effect.gen(function* () {
    const feed = yield* getOrCreateTraceFeed();

    const runtime = yield* Effect.runtime<Feed.Service>();

    return {
      write: (message) => {
        // Run append in a fork asynchronously.
        Feed.append(feed, [message]).pipe(Runtime.runFork(runtime));
      },
    } satisfies Trace.Sink;
  }),
);

export const getOrCreateTraceFeed = Effect.fn('getOrCreateTraceFeed')(function* () {
  const feeds = yield* Database.runQuery(
    Query.select(Filter.type(Feed.Feed, { kind: TRACE_FEED_KIND }))
      // In-rare cases its possible to have multiple trace feeds, natural order ensures that all clients use the same feed.
      .orderBy(Order.natural),
  );
  if (feeds.length > 0) {
    return feeds[0];
  }
  return yield* Database.add(Feed.make({ kind: TRACE_FEED_KIND, name: 'Execution Trace', namespace: 'trace' }));
});
