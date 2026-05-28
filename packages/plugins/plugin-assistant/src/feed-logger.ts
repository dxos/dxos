//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { createFeedServiceLayer, type Space, getSpace } from '@dxos/client/echo';
import { Sequence, type SequenceEvent, type SequenceLogger } from '@dxos/conductor';
import { Feed, Obj, Ref } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { InvocationTraceEndEvent, InvocationTraceEventType, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { TraceEvent } from '@dxos/functions-runtime';
import { InvocationOutcome } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { EchoURI, type ObjectId } from '@dxos/keys';

export class QueueLogger implements SequenceLogger {
  private _space: Space;
  private _invocationTraceFeed: Feed.Feed;
  private _feedServiceLayer: Layer.Layer<Feed.FeedService>;

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
      invariant(Feed.getQueueUri(existingFeedRef.target), 'invocationTraceFeed has no queue DXN');
      this._invocationTraceFeed = existingFeedRef.target;
    } else {
      const feed = space.db.add(Feed.make({ namespace: 'trace' }));
      invariant(Feed.getQueueUri(feed), 'New invocationTraceFeed has no queue DXN');
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
            invocationTraceFeed: Ref.fromURI(this._getTraceQueueEchoId(event.invocationId)),
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

  private _getTraceQueueEchoId(invocationId: ObjectId): EchoURI.EchoURI {
    return EchoURI.make({ spaceId: this._space.id, objectId: invocationId });
  }

  private _appendToTraceFeed(items: any[]): Promise<void> {
    return Feed.append(this._invocationTraceFeed, items).pipe(
      Effect.provide(this._feedServiceLayer),
      runAndForwardErrors,
    );
  }

  // TODO(burdon): The per-invocation trace event queues address feeds by raw queue DXN
  // (no backing Feed.Feed object). Migration to Feed.append is blocked on either
  // (a) materializing a Feed object per invocation, or (b) a lower-level
  // FeedService.appendByDxn primitive. Tracked as Phase 6 work in echo/AUDIT.md.
  private _getTraceEventQueue(invocationId: ObjectId): Queue<TraceEvent> {
    const echoUri = this._getTraceQueueEchoId(invocationId);
    return this._space.queues.get(echoUri);
  }
}
