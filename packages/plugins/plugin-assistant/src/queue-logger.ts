//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type Layer } from 'effect/Layer';

import { createFeedServiceLayer, type Queue, type Space, getSpace } from '@dxos/client/echo';
import { Sequence, type SequenceEvent, type SequenceLogger } from '@dxos/conductor';
import { DXN, Feed, Obj, Ref } from '@dxos/echo';
import { InvocationTraceEndEvent, InvocationTraceEventType, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { TraceEvent } from '@dxos/functions-runtime';
import { InvocationOutcome } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { QueueSubspaceTags } from '@dxos/keys';

export class QueueLogger implements SequenceLogger {
  private _space: Space;
  private _invocationTraceFeed: Feed.Feed;
  private _feedServiceLayer: Layer<Feed.FeedService>;

  constructor(private readonly sequence: Sequence.Sequence) {
    const space = getSpace(sequence);
    invariant(space, 'Space not found');
    this._space = space;
    this._feedServiceLayer = createFeedServiceLayer(space.queues);

    const existingFeedRef = this._space.properties.invocationTraceFeed;

    if (existingFeedRef) {
      // A feed reference exists; ensure its target is loaded. If not, fail loudly
      // rather than silently creating a new feed and orphaning existing traces.
      invariant(existingFeedRef.target, 'invocationTraceFeed reference is not yet loaded');
      invariant(Feed.getQueueDxn(existingFeedRef.target), 'invocationTraceFeed has no queue DXN');
      this._invocationTraceFeed = existingFeedRef.target;
    } else {
      const feed = space.db.add(Feed.make({ namespace: 'trace' }));
      invariant(Feed.getQueueDxn(feed), 'New invocationTraceFeed has no queue DXN');
      Obj.update(this._space.properties, (obj) => {
        obj.invocationTraceFeed = Ref.make(feed);
      });
      this._invocationTraceFeed = feed;
    }
  }

  log(event: SequenceEvent) {
    switch (event.type) {
      case 'begin':
        void this._appendToTraceFeed([
          Obj.make(InvocationTraceStartEvent, {
            type: InvocationTraceEventType.START,
            invocationId: event.invocationId,
            timestamp: Date.now(),
            input: {},
            invocationTraceQueue: Ref.fromDXN(this._getTraceQueueDxn(event.invocationId)),
            invocationTarget: Ref.make(this.sequence),
          }),
        ]);
        break;
      case 'end':
        void this._appendToTraceFeed([
          Obj.make(InvocationTraceEndEvent, {
            type: InvocationTraceEventType.END,
            invocationId: event.invocationId,
            timestamp: Date.now(),
            outcome: InvocationOutcome.SUCCESS,
          }),
        ]);
        break;
      case 'step-start':
      case 'step-complete':
        void this._getTraceEventQueue(event.invocationId).append([
          Obj.make(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestamp: Date.now(),
            logs: [
              {
                timestamp: Date.now(),
                level: 'info',
                message: event.type,
                context: { step: event.step },
              },
            ],
            exceptions: [],
          }),
        ]);
        break;
      case 'message':
        void this._getTraceEventQueue(event.invocationId).append([
          Obj.make(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestamp: Date.now(),
            logs: [
              {
                timestamp: Date.now(),
                level: 'info',
                message: event.type,
                context: { message: event.message },
              },
            ],
            exceptions: [],
          }),
        ]);
        break;
      case 'block':
        void this._getTraceEventQueue(event.invocationId).append([
          Obj.make(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestamp: Date.now(),
            logs: [
              {
                timestamp: Date.now(),
                level: 'info',
                message: event.type,
                context: { block: event.block },
              },
            ],
            exceptions: [],
          }),
        ]);
        break;
    }
  }

  private _getTraceQueueDxn(invocationId: string): DXN {
    return DXN.fromQueue(QueueSubspaceTags.TRACE, this._space.id, invocationId);
  }

  private _appendToTraceFeed(items: any[]): Promise<void> {
    return Effect.runPromise(
      Feed.append(this._invocationTraceFeed, items).pipe(Effect.provide(this._feedServiceLayer)),
    );
  }

  // TODO(burdon): The per-invocation trace event queues address feeds by raw queue DXN
  // (no backing Feed.Feed object). Migration to Feed.append is blocked on either
  // (a) materializing a Feed object per invocation, or (b) a lower-level
  // FeedService.appendByDxn primitive. Tracked as Phase 6 work in echo/AUDIT.md.
  private _getTraceEventQueue(invocationId: string): Queue<TraceEvent> {
    const dxn = this._getTraceQueueDxn(invocationId);
    return this._space.queues.get(dxn);
  }
}
