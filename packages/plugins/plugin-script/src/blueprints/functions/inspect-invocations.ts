//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Query } from '@dxos/echo';
import { getUserFunctionIdInMetadata, QueueService } from '@dxos/functions';
import { type InvocationTraceEvent, createInvocationSpans } from '@dxos/functions-runtime';
import { Operation } from '@dxos/operation';
import { SpaceProperties } from '@dxos/client-protocol';

import { InspectInvocations } from './definitions';

export default InspectInvocations.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script, limit }) {
      const loaded = yield* Database.load(script);
      const maxResults = limit ?? 20;

      const [properties] = yield* Database.runQuery(Query.type(SpaceProperties));
      if (!properties?.invocationTraceQueue?.target) {
        return { invocations: [], total: 0 };
      }

      const queue = yield* QueueService.getQueue<InvocationTraceEvent>(
        properties.invocationTraceQueue.target.dxn,
      );
      const events = yield* Effect.promise(() => queue.queryObjects());
      const allSpans = createInvocationSpans(events);

      const deployedFunctions = yield* Database.runQuery(
        Query.select(Filter.type(Operation.PersistentOperation)),
      );
      const scriptFunctionIds = new Set(
        deployedFunctions
          .filter((fn) => fn.source?.target?.id === loaded.id)
          .map((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)))
          .filter(Boolean),
      );

      const filtered = allSpans.filter((span) => {
        if (!span.invocationTarget) {
          return false;
        }
        const targetDxn = span.invocationTarget.dxn.toString();
        const uuidPart = targetDxn.split(':').pop();
        return uuidPart ? scriptFunctionIds.has(uuidPart) : false;
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
