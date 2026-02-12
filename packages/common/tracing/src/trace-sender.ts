//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { type Client } from '@dxos/protocols';
import { create } from '@dxos/protocols/buf';
import { type LogEntry } from '@dxos/protocols/buf/dxos/client/logging_pb';
import { type StreamTraceEvent, StreamTraceEventSchema } from '@dxos/protocols/buf/dxos/tracing_pb';

import { type TraceProcessor, type TraceSubscription } from './trace-processor';

export class TraceSender implements Client.TracingService {
  constructor(private _traceProcessor: TraceProcessor) {}

  streamTrace(): Stream<StreamTraceEvent> {
    return new Stream(({ ctx, next }) => {
      const flushEvents = (resources: Set<number> | null, spans: Set<number> | null, logs: LogEntry[] | null) => {
        const resourceAdded: Array<{ resource: any }> = [];
        const resourceRemoved: Array<{ id: number }> = [];
        const spanAdded: Array<{ span: any }> = [];
        const logAdded: Array<{ log: any }> = [];

        if (resources) {
          for (const id of resources) {
            const entry = this._traceProcessor.resources.get(id);
            if (entry) {
              resourceAdded.push({ resource: entry.data });
            } else {
              resourceRemoved.push({ id });
            }
          }
        } else {
          for (const entry of this._traceProcessor.resources.values()) {
            resourceAdded.push({ resource: entry.data });
          }
        }

        if (spans) {
          for (const id of spans) {
            const span = this._traceProcessor.spans.get(id);
            if (span) {
              spanAdded.push({ span });
            }
          }
        } else {
          for (const span of this._traceProcessor.spans.values()) {
            spanAdded.push({ span });
          }
        }

        if (logs) {
          for (const log of logs) {
            logAdded.push({ log });
          }
        } else {
          for (const log of this._traceProcessor.logs) {
            logAdded.push({ log });
          }
        }

        if (resourceAdded.length > 0 || resourceRemoved.length > 0 || spanAdded.length > 0) {
          next(
            create(StreamTraceEventSchema, {
              resourceAdded,
              resourceRemoved,
              spanAdded,
              logAdded,
            } as any),
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
