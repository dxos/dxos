//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Trace } from '@dxos/compute';
import { Database, Query } from '@dxos/echo';
import { FeedTraceSink } from '@dxos/functions-runtime';

import { InspectInvocations } from './definitions';

type Span = {
  pid: string;
  timestamp: number;
  duration: number;
  outcome: 'success' | 'failure' | 'pending';
  key?: string;
  input: Record<string, unknown>;
  error?: string;
};

export default InspectInvocations.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn, limit }) {
      const loaded = yield* Database.load(fn);
      const maxResults = limit ?? 20;

      const feeds = yield* Database.runQuery(FeedTraceSink.query);
      const feed = feeds[0];
      if (!feed) {
        return { invocations: [], total: 0 };
      }

      const messages = yield* Database.runQuery(Query.type(Trace.Message).from(feed));

      // Fold trace messages into one span per pid (matches OperationStart with OperationEnd).
      type Entry = {
        start?: { timestamp: number; data: Trace.PayloadType<typeof Trace.OperationStart> };
        end?: { timestamp: number; data: Trace.PayloadType<typeof Trace.OperationEnd> };
      };
      const byPid = new Map<string, Entry>();
      for (const message of messages) {
        const pid = message.meta.pid;
        if (!pid) {
          continue;
        }
        const entry = byPid.get(pid) ?? {};
        for (const event of message.events) {
          if (Trace.isOfType(Trace.OperationStart, event)) {
            entry.start = { timestamp: event.timestamp, data: event.data };
          } else if (Trace.isOfType(Trace.OperationEnd, event)) {
            entry.end = { timestamp: event.timestamp, data: event.data };
          }
        }
        byPid.set(pid, entry);
      }

      const now = Date.now();
      const allSpans: Span[] = [];
      for (const [pid, { start, end }] of byPid.entries()) {
        if (!start) {
          continue;
        }
        const input = start.data.input;
        allSpans.push({
          pid,
          timestamp: start.timestamp,
          duration: end ? end.timestamp - start.timestamp : now - start.timestamp,
          outcome: end?.data.outcome ?? 'pending',
          key: start.data.key,
          input: input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : { value: input },
          error: end?.data.error,
        });
      }

      const filtered = allSpans.filter((span) => span.key === loaded.key);
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      const total = filtered.length;
      const invocations = filtered.slice(0, maxResults).map((span) => ({
        id: span.pid,
        timestamp: span.timestamp,
        duration: span.duration,
        outcome: span.outcome,
        input: span.input,
        error: span.error,
      }));

      return { invocations, total };
    }),
  ),
);
