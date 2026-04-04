//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Query } from '@dxos/echo';
import { getUserFunctionIdInMetadata, QueueService } from '@dxos/functions';
import { type InvocationTraceEvent, createInvocationSpans } from '@dxos/functions-runtime';
import { Operation } from '@dxos/operation';
import { SpaceProperties } from '@dxos/client-protocol';

import { InspectInvocations } from './definitions';

export default InspectInvocations.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn, limit }) {
      const loaded = yield* Database.load(fn);
      const maxResults = limit ?? 20;

      const [properties] = yield* Database.runQuery(Query.type(SpaceProperties));
      if (!properties?.invocationTraceQueue?.target) {
        return { invocations: [], total: 0 };
      }

      const queue = yield* QueueService.getQueue<InvocationTraceEvent>(properties.invocationTraceQueue.target.dxn);
      const events = yield* Effect.promise(() => queue.queryObjects());
      const allSpans = createInvocationSpans(events);

      const functionId = getUserFunctionIdInMetadata(Obj.getMeta(loaded));

      const filtered = allSpans.filter((span) => {
        if (!span.invocationTarget || !functionId) {
          return false;
        }
        const targetDxn = span.invocationTarget.dxn.toString();
        const uuidPart = targetDxn.split(':').pop();
        return uuidPart === functionId;
      });

      filtered.sort((a, b) => b.timestamp - a.timestamp);
      const total = filtered.length;
      const invocations = filtered.slice(0, maxResults).map((span) => ({
        id: span.id,
        timestamp: span.timestamp,
        duration: span.duration,
        outcome: span.outcome,
        input: span.input,
        error: span.error ? (span.error as object) : undefined,
      }));

      return { invocations, total };
    }),
  ),
);
