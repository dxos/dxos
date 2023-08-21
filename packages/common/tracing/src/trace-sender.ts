//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { StreamTraceEvent, TracingService } from '@dxos/protocols/proto/dxos/tracing';

import { TraceProcessor, TraceSubscription } from './trace-processor';

const FLUSH_INTERVAL = 1_000;

export class TraceSender implements TracingService {
  constructor(private _traceProcessor: TraceProcessor) {}

  streamTrace(request: void): Stream<StreamTraceEvent> {
    return new Stream(({ ctx, next }) => {
      const subscription: TraceSubscription = {
        dirtyResources: new Set(),
        dirtySpans: new Set(),
      };
      this._traceProcessor.subscriptions.add(subscription);
      ctx.onDispose(() => {
        this._traceProcessor.subscriptions.delete(subscription);
      });

      const flushEvents = (resources: Set<number> | null, spans: Set<number> | null) => {
        const event: StreamTraceEvent = {
          resourceAdded: [],
          resourceRemoved: [],
          spanAdded: [],
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

        if (event.resourceAdded!.length > 0 || event.resourceRemoved!.length > 0 || event.spanAdded!.length > 0) {
          next(event);
        }
      };

      flushEvents(null, null);

      const timer = setInterval(() => {
        flushEvents(subscription.dirtyResources, subscription.dirtySpans);
        subscription.dirtyResources.clear();
        subscription.dirtySpans.clear();
      }, FLUSH_INTERVAL);
      ctx.onDispose(() => {
        clearInterval(timer);
      });
    });
  }
}
