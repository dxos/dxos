//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Layer from 'effect/Layer';
import * as Effect from 'effect/Effect';
import * as FeedTraceSink from './FeedTraceSink';
import { TestDatabaseLayer } from './testing';
import { Trace } from '@dxos/functions';
import * as Schema from 'effect/Schema';
import { Database, Filter, Query } from '@dxos/echo';

const TestLayer = Layer.empty.pipe(
  Layer.provideMerge(Trace.testTraceService({ meta: { processName: 'test' } })),
  Layer.provideMerge(FeedTraceSink.layerLive),
  Layer.provideMerge(TestDatabaseLayer()),
);

const TestEvent = Trace.EventType('test', { schema: Schema.String, isEphemeral: false });

describe('FeedTraceSink', () => {
  it.effect(
    'write and query from the trace feed',
    Effect.fnUntraced(function* ({ expect }) {
      yield* Trace.write(TestEvent, 'foo');
      yield* Trace.write(TestEvent, 'bar');
      yield* FeedTraceSink.flush();
      yield* Database.flush();
      const feed = yield* FeedTraceSink.getOrCreateTraceFeed();
      const messages = yield* Database.runQuery(Query.select(Filter.type(Trace.Message)).from(feed));
      expect(messages).toHaveLength(2);
      expect(messages[0].meta.processName).toBe('test');
      expect(messages[0].events[0].data).toBe('foo');
      expect(messages[1].meta.processName).toBe('test');
      expect(messages[1].events[0].data).toBe('bar');
    }, Effect.provide(TestLayer)),
  );
});
