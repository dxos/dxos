//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type Space, getSpace } from '@dxos/client/echo';
import { Sequence, type SequenceEvent, type SequenceLogger } from '@dxos/conductor';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { InvocationTraceEndEvent, InvocationTraceEventType, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { TraceEvent } from '@dxos/functions-runtime';
import { InvocationOutcome } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { type EntityId } from '@dxos/keys';

export class QueueLogger implements SequenceLogger {
  private _space: Space;
  private _invocationTraceFeed: Feed.Feed;
  private _feedServiceLayer: Layer.Layer<Database.Service>;
  /** Per-invocation trace feeds, keyed by invocationId. Created on `begin` and looked up for subsequent events. */
  private _invocationFeeds = new Map<EntityId, Feed.Feed>();

  constructor(private readonly sequence: Sequence.Sequence) {
    const space = getSpace(sequence);
    invariant(space, 'Space not found');
    this._space = space;
    this._feedServiceLayer = Database.layer(space.db);

    const existingFeedRef = this._space.properties.invocationTraceFeed;

    if (existingFeedRef) {
      // A feed reference exists; ensure its target is loaded. If not, fail loudly
      // rather than silently creating a new feed and orphaning existing traces.
      invariant(existingFeedRef.target, 'invocationTraceFeed reference is not yet loaded');
      invariant(Feed.getFeedUri(existingFeedRef.target), 'invocationTraceFeed has no feed URI');
      this._invocationTraceFeed = existingFeedRef.target;
    } else {
      const feed = space.db.add(Feed.make({ namespace: 'trace' }));
      invariant(Feed.getFeedUri(feed), 'New invocationTraceFeed has no feed URI');
      Obj.update(this._space.properties, (obj) => {
        obj.invocationTraceFeed = Ref.make(feed);
      });
      this._invocationTraceFeed = feed;
    }
  }

  log(event: SequenceEvent) {
    switch (event.type) {
      case 'begin': {
        // Create a per-invocation trace feed and store it so subsequent events can append to it.
        const invocationFeed = this._space.db.add(Feed.make({ namespace: 'trace' }));
        this._invocationFeeds.set(event.invocationId, invocationFeed);
        void this._appendToTraceFeed([
          Obj.make(InvocationTraceStartEvent, {
            type: InvocationTraceEventType.START,
            invocationId: event.invocationId,
            timestamp: Date.now(),
            input: {},
            invocationTraceFeed: Ref.make(invocationFeed),
            invocationTarget: Ref.make(this.sequence),
          }),
        ]);
        break;
      }
      case 'end':
        void this._appendToTraceFeed([
          Obj.make(InvocationTraceEndEvent, {
            type: InvocationTraceEventType.END,
            invocationId: event.invocationId,
            timestamp: Date.now(),
            outcome: InvocationOutcome.SUCCESS,
          }),
        ]);
        // Clean up the per-invocation feed reference once the invocation is complete.
        this._invocationFeeds.delete(event.invocationId);
        break;
      case 'step-start':
      case 'step-complete':
        void this._appendToInvocationFeed(event.invocationId, [
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
        void this._appendToInvocationFeed(event.invocationId, [
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
        void this._appendToInvocationFeed(event.invocationId, [
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

  private _appendToTraceFeed(items: any[]): Promise<void> {
    return Feed.append(this._invocationTraceFeed, items).pipe(
      Effect.provide(this._feedServiceLayer),
      EffectEx.runAndForwardErrors,
    );
  }

  private _appendToInvocationFeed(invocationId: EntityId, items: any[]): Promise<void> {
    const invocationFeed = this._invocationFeeds.get(invocationId);
    if (!invocationFeed) {
      return Promise.resolve();
    }
    return this._space.db.appendToFeed(invocationFeed, items);
  }
}
