//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Fact from './Fact.ts';

/** A subscription's id, unique in its space; chosen by the caller. */
export const SubscriptionId = Schema.String.pipe(Schema.brand('@dxos/echo-memory/SubscriptionId'));
export type SubscriptionId = Schema.Schema.Type<typeof SubscriptionId>;

/** An event's id, stable per subscription, wake and facts, so a wake derived twice queues once. */
export const MemoryEventId = Schema.String.pipe(Schema.brand('@dxos/echo-memory/MemoryEventId'));
export type MemoryEventId = Schema.Schema.Type<typeof MemoryEventId>;

/** Most subscriptions one space's memory holds at once. */
export const MAX_SUBSCRIPTIONS = 256;

/** Goal rules held against a space's memory, and the caller's own record of why. */
export const Subscription = Schema.Struct({
  id: SubscriptionId,
  /** The agent that holds it; `subscriptions(owner)` filters by it. */
  owner: Schema.optional(Fact.EntityKey),
  /** Datalog goal rules (`@dxos/brain`). */
  rules: Schema.String,
  /** ISO; facts put before it wake nothing. */
  createdAt: Schema.String,
  /** Stored and returned as is; never interpreted by memory. */
  payload: Schema.optional(Schema.Unknown),
});
export interface Subscription extends Schema.Schema.Type<typeof Subscription> {}

/** One wake of a subscription's rules, queued in its outbox until acknowledged. */
export const MemoryEvent = Schema.Struct({
  id: MemoryEventId,
  subscription: SubscriptionId,
  /** The rules' wake label, `achieved`, or a sub-goal id. */
  label: Schema.String,
  /** The facts behind the wake; empty for a wake the clock caused. */
  facts: Schema.Array(Fact.Fact),
  /** When it woke (ISO). */
  at: Schema.String,
});
export interface MemoryEvent extends Schema.Schema.Type<typeof MemoryEvent> {}
