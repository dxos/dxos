//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type Client } from '@dxos/protocols';
import { create } from '@dxos/protocols/buf';
import { type LogEntry } from '@dxos/protocols/buf/dxos/client/logging_pb';
import {
  type StreamTraceEvent,
  StreamTraceEventSchema,
  type StreamTraceEvent_LogAdded,
  type StreamTraceEvent_ResourceAdded,
  type StreamTraceEvent_ResourceRemoved,
  type StreamTraceEvent_SpanAdded,
} from '@dxos/protocols/buf/dxos/tracing_pb';

import { type TraceProcessor, type TraceSubscription } from './trace-processor';

export class TraceSender implements Client.TracingService {
  constructor(private _traceProcessor: TraceProcessor) {}

  streamTrace(): Stream<StreamTraceEvent> {
    return new Stream(({ ctx, next }) => {
      const flushEvents = (resources: Set<number> | null, spans: Set<number> | null, logs: LogEntry[] | null) => {
        const resourceAdded: StreamTraceEvent_ResourceAdded[] = [];
        const resourceRemoved: StreamTraceEvent_ResourceRemoved[] = [];
        const spanAdded: StreamTraceEvent_SpanAdded[] = [];
        const logAdded: StreamTraceEvent_LogAdded[] = [];

        if (resources) {
          for (const id of resources) {
            const entry = this._traceProcessor.resources.get(id);
            if (entry) {
              resourceAdded.push({ resource: entry.data } as never);
            } else {
              resourceRemoved.push({ id } as never);
            }
          }
        } else {
          for (const entry of this._traceProcessor.resources.values()) {
            resourceAdded.push({ resource: entry.data } as never);
          }
        }

        if (spans) {
          for (const id of spans) {
            const span = this._traceProcessor.spans.get(id);
            if (span) {
              spanAdded.push({ span } as never);
            }
          }
        } else {
          for (const span of this._traceProcessor.spans.values()) {
            spanAdded.push({ span } as never);
          }
        }

        if (logs) {
          for (const log of logs) {
            logAdded.push({ log } as never);
          }
        } else {
          for (const log of this._traceProcessor.logs) {
            logAdded.push({ log } as never);
          }
        }

        if (resourceAdded.length > 0 || resourceRemoved.length > 0 || spanAdded.length > 0) {
          next(
            create(StreamTraceEventSchema, {
              resourceAdded,
              resourceRemoved,
              spanAdded,
              logAdded,
            }),
          );
        }
      };

      const flush = () => {
        flushEvents(subscription.dirtyResources, subscription.dirtySpans, subscription.newLogs);
        subscription.dirtyResources.clear();
        subscription.dirtySpans.clear();
        subscription.newLogs.length = 0;
      };

      const subscription: TraceSubscription = {
        flush,
        dirtyResources: new Set(),
        dirtySpans: new Set(),
        newLogs: [],
      };
      this._traceProcessor.subscriptions.add(subscription);
      ctx.onDispose(() => {
        this._traceProcessor.subscriptions.delete(subscription);
      });

      flushEvents(null, null, null);
    });
  }
}
