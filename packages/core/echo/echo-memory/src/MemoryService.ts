//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Fact from './Fact.ts';
import type * as MemoryError from './MemoryError.ts';
import type * as MemoryQuery from './MemoryQuery.ts';
import type * as Subscription from './Subscription.ts';

/** How far a source has been read into facts. */
export const ReadCursor = Schema.Struct({
  /** The source read (a chat, a feed, a mailbox). */
  source: Fact.SourceUri,
  /** URI or hash of the last item read; the next read starts after it. */
  through: Schema.String,
});
export interface ReadCursor extends Schema.Schema.Type<typeof ReadCursor> {}

export const PutOptions = Schema.Struct({
  /** Speakers whose facts are stored but wake nothing on their own. */
  quiet: Schema.optional(Schema.Array(Fact.EntityKey)),
  /** Moved in the same write as the facts. */
  read: Schema.optional(ReadCursor),
});
export interface PutOptions extends Schema.Schema.Type<typeof PutOptions> {}

/**
 * The memory of one space, in two halves over one store.
 *
 * - Knowledge base: {@link Service.put} stores facts and {@link Service.query} reads them back.
 * - Event base: a subscription carries goal rules; whenever put facts or the clock wake them, an event is queued
 *   in that subscription's own outbox, which its consumer drains with {@link Service.take} and {@link Service.ack}.
 *
 * Time-driven rules are evaluated by the implementation on its own; the interface has no op for the clock.
 */
export interface Service {
  /**
   * Stores facts (a repeated put is idempotent), moves `options.read` in the same write, and returns how many
   * events the write queued. A put with no facts only moves the cursor.
   */
  readonly put: (facts: readonly Fact.Fact[], options?: PutOptions) => Effect.Effect<number, MemoryError.MemoryError>;

  /** The only read of the knowledge base; the query's kind fixes what it answers. */
  readonly query: <Q extends MemoryQuery.Any>(
    query: Q,
  ) => Effect.Effect<MemoryQuery.ResultOf<Q>, MemoryError.MemoryError>;

  /**
   * Forgets the facts, read cursors and queued events, and restores the seed vocabulary; subscriptions stay, with
   * their rule state started over.
   */
  readonly reset: () => Effect.Effect<void, MemoryError.MemoryError>;

  /**
   * Adds a subscription, or replaces the one with its id. False, adding nothing, when the space holds
   * `MAX_SUBSCRIPTIONS` others; fails when its rules do not compile.
   */
  readonly subscribe: (subscription: Subscription.Subscription) => Effect.Effect<boolean, MemoryError.MemoryError>;

  /** Subscriptions oldest first: all, or those the owner holds. */
  readonly subscriptions: (
    owner?: Fact.EntityKey,
  ) => Effect.Effect<Subscription.Subscription[], MemoryError.MemoryError>;

  /** Removes a subscription and its outbox; false when it was already gone. */
  readonly unsubscribe: (id: Subscription.SubscriptionId) => Effect.Effect<boolean, MemoryError.MemoryError>;

  /** The subscription's unacknowledged events, oldest first; empty for an unknown subscription. */
  readonly take: (
    id: Subscription.SubscriptionId,
  ) => Effect.Effect<Subscription.MemoryEvent[], MemoryError.MemoryError>;

  /** Removes the events from the outbox; unknown ids are ignored. */
  readonly ack: (
    id: Subscription.SubscriptionId,
    events: readonly Subscription.MemoryEventId[],
  ) => Effect.Effect<void, MemoryError.MemoryError>;
}

export class MemoryService extends Context.Service<MemoryService, Service>()('@dxos/echo-memory/MemoryService') {}

/** Re-exported so callers importing this module as a namespace avoid `MemoryService.MemoryService.key`. */
export const key = MemoryService.key;
