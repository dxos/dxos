//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { getUserFunctionIdInMetadata } from '@dxos/compute-runtime';
import { InvocationTraceEndEvent, InvocationTraceStartEvent, createInvocationSpans } from '@dxos/compute-runtime';

import { InspectInvocations } from './definitions';

export default InspectInvocations.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn, limit }) {
      const loaded = yield* Database.load(fn);
      const maxResults = limit ?? 20;

      const [properties] = yield* Database.query(Query.type(SpaceProperties)).run;
      if (!properties?.invocationTraceFeed) {
        return { invocations: [], total: 0 };
      }

      const feed = yield* Database.load(properties.invocationTraceFeed);
      const startEvents = yield* Feed.query(feed, Filter.type(InvocationTraceStartEvent)).run;
      const endEvents = yield* Feed.query(feed, Filter.type(InvocationTraceEndEvent)).run;
      const allSpans = createInvocationSpans([...startEvents, ...endEvents]);

      const functionId = getUserFunctionIdInMetadata(Obj.getMeta(loaded));

      const filtered = allSpans.filter((span) => {
        if (!span.invocationTarget || !functionId) {
          return false;
        }
        const targetDxn = span.invocationTarget.uri;
        const uuidPart = targetDxn.split(':').pop();
        return uuidPart === functionId;
      });

      filtered.sort((a, b) => b.timestamp - a.timestamp);
      const total = filtered.length;
      const invocations = filtered.slice(0, maxResults).map((span) => ({
        id: span.id,
        timestamp: span.timestamp,
        duration: span.duration,
        outcome: `${span.outcome}`,
        input: span.input !== null && typeof span.input === 'object' ? span.input : { value: span.input },
        error: span.error ? (span.error as object) : undefined,
      }));

      return { invocations, total };
    }),
  ),
);
