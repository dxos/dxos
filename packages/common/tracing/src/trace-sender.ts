//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { type LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { type StreamTraceEvent, type TracingService } from '@dxos/protocols/proto/dxos/tracing';

import { type TraceProcessor, type TraceSubscription } from './trace-processor';

export class TraceSender implements TracingService {
  constructor(private _traceProcessor: TraceProcessor) {}

  streamTrace(request: void): Stream<StreamTraceEvent> {
    return new Stream(({ ctx, next }) => {
      const flushEvents = (resources: Set<number> | null, spans: Set<number> | null, logs: LogEntry[] | null) => {
        const event: StreamTraceEvent = {
          resourceAdded: [],
          resourceRemoved: [],
          spanAdded: [],
          logAdded: [],
        };

        if (resources) {
          for (const id of resources) {
            const entry = this._traceProcessor.resources.get(id);
            if (entry) {
              event.resourceAdded!.push({ resource: entry.data });
            } else {
              event.resourceRemoved!.push({ id });
            }
          }
        } else {
          for (const entry of this._traceProcessor.resources.values()) {
            event.resourceAdded!.push({ resource: entry.data });
          }
        }

        if (spans) {
          for (const id of spans) {
            const span = this._traceProcessor.spans.get(id);
            if (span) {
              event.spanAdded!.push({ span });
            }
          }
        } else {
          for (const span of this._traceProcessor.spans.values()) {
            event.spanAdded!.push({ span });
          }
        }

        if (logs) {
          for (const log of logs) {
            event.logAdded!.push({ log });
          }
        } else {
          for (const log of this._traceProcessor.logs) {
            event.logAdded!.push({ log });
          }
        }

        if (event.resourceAdded!.length > 0 || event.resourceRemoved!.length > 0 || event.spanAdded!.length > 0) {
          next(event);
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
