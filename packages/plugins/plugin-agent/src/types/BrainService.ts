//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import type * as Chat from '@dxos/assistant/Chat';
import type * as AgentService from '@dxos/compute/AgentService';
import type { Database } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import type { RDF } from '@dxos/pipeline-rdf';
import { ContentBlock } from '@dxos/types';

import * as FactEntry from './FactEntry.ts';
import * as Trigger from './Trigger.ts';

/**
 * What a fact query selects; every field set must hold. Mirrors pipeline-rdf's `SemanticQuery`, so the
 * store answers it without a SPARQL engine on every platform.
 */
export const FactQuery = Schema.Struct({
  /** Entity id (pipeline-rdf slug, e.g. `bob`) in the subject position. */
  subjectEntity: Schema.optional(Schema.String),
  /** Entity id in the subject or object position. */
  entity: Schema.optional(Schema.String),
  predicate: Schema.optional(Schema.String),
  /** DXN of the message (or other source) the facts were read from. */
  source: Schema.optional(Schema.String),
});

export interface FactQuery extends Schema.Schema.Type<typeof FactQuery> {}

/** A request to start a turn in a chat: the prompt lands as a synthetic note ({@link wakeBlocks}), so the agent replies there. */
export type WakeRequest = {
  readonly chat: Chat.Chat;
  readonly prompt: string;
  readonly sender?: AgentService.PromptSender;
};

/** The brain refused or could not be reached; the message says which. */
export class BrainError extends BaseError.extend('BrainError', 'The agent brain failed.') {}

/**
 * An event queued in a subscription's outbox: one pushed fact its pattern matched. Events stay queued
 * until acknowledged, so a consumer that fails between {@link Service.take} and {@link Service.ack}
 * sees them again.
 */
export const Event = Schema.Struct({
  /** Stable per subscription and fact, so pushing a fact twice queues it once. */
  id: Schema.String,
  subscription: Schema.String,
  fact: FactEntry.Fact,
});

export interface Event extends Schema.Schema.Type<typeof Event> {}

export type PushOptions = {
  /** Speakers (entity slugs) whose facts are stored but queue no events: an agent's own words must not wake it. */
  readonly quiet?: readonly string[];
};

/**
 * An agent's brain, in two halves.
 *
 * - Knowledge base: {@link Service.push} stores facts extracted from conversations (an RDF store) and
 *   {@link Service.query} reads them back.
 * - Event base: a subscription (a {@link Trigger.Trigger}) is a standing pattern; every pushed fact it
 *   matches is queued in that subscription's own outbox, which its consumer drains with
 *   {@link Service.take} and {@link Service.ack}.
 *
 * One brain per agent, keyed by the agent's entity id. Implementations differ per platform: in memory
 * in the client (`BrainMemory`), a Durable Object with SQLite on EDGE.
 */
export interface Service {
  /**
   * Stores facts (one copy each) and queues an event in every matching subscription's outbox; returns
   * how many events were queued.
   */
  readonly push: (
    agent: string,
    facts: readonly RDF.Fact[],
    options?: PushOptions,
  ) => Effect.Effect<number, BrainError>;

  /** The agent's facts matching the query. */
  readonly query: (agent: string, query: FactQuery) => Effect.Effect<RDF.Fact[], BrainError>;

  /**
   * Adds or replaces a subscription; it matches facts pushed from its `createdAt` on. False when the
   * agent already holds {@link MAX_TRIGGERS} others.
   */
  readonly subscribe: (subscription: Trigger.Trigger) => Effect.Effect<boolean, BrainError>;

  /** The agent's subscriptions, oldest first. */
  readonly subscriptions: (agent: string) => Effect.Effect<Trigger.Trigger[], BrainError>;

  /**
   * Removes a subscription and drops its outbox; false when it was already gone, so only one caller
   * acts on a one-time subscription.
   */
  readonly unsubscribe: (id: string) => Effect.Effect<boolean, BrainError>;

  /** The subscription's unacknowledged events, oldest first; empty for an unknown subscription. */
  readonly take: (id: string) => Effect.Effect<Event[], BrainError>;

  /** Removes the events from the subscription's outbox; unknown ids are ignored. */
  readonly ack: (id: string, events: readonly string[]) => Effect.Effect<void, BrainError>;

  /**
   * Starts a turn in the chat with the prompt as a synthetic note. Returns once the turn is scheduled,
   * not when it ends: a relay must not hold the turn that sent it.
   */
  readonly wake: (request: WakeRequest) => Effect.Effect<void, BrainError, Database.Service>;
}

export class BrainService extends Context.Service<BrainService, Service>()('@dxos/plugin-agent/BrainService') {}

/** Re-exported so callers importing this module as a namespace avoid `BrainService.BrainService.key`. */
export const key = BrainService.key;

/**
 * Most subscriptions an agent holds at once: ongoing ones never fire away, so without a cap the store
 * (and the match on every push) would grow with every watch an agent is asked for.
 */
export const MAX_TRIGGERS = 256;

/**
 * The content a woken chat's turn starts from: a synthetic text block, so it renders as a system note rather than
 * a user message, and reading the chat into facts skips it (the agent relayed it; no person said it).
 */
export const wakeBlocks = (prompt: string): ContentBlock.Any[] => [
  ContentBlock.Text.make({ text: prompt, disposition: 'synthetic' }),
];

/** A trigger as plain JSON, for brains across a wire (its refs become `{ "/": uri }`). */
export const encodeTrigger = Schema.encodeSync(Trigger.Trigger);

/** The inverse of {@link encodeTrigger}; refs come back unresolved, to be loaded through the database. */
export const decodeTrigger = Schema.decodeUnknownSync(Trigger.Trigger);

/** The id of the event a fact queues for a subscription. */
export const eventId = (subscription: string, fact: string): string => `${subscription}:${fact}`;

/**
 * The event a fact queues for the subscription, or `undefined` when the subscription does not want it:
 * the fact does not match, was said before the subscription began, or comes from a quiet speaker.
 */
export const matchEvent = (
  subscription: Trigger.Trigger,
  fact: RDF.Fact,
  { quiet = [] }: PushOptions = {},
): Event | undefined =>
  (fact.attribution.agent !== undefined && quiet.includes(fact.attribution.agent)) ||
  !Trigger.matchesPattern(subscription.when, fact, { after: subscription.createdAt })
    ? undefined
    : { id: eventId(subscription.id, fact.id), subscription: subscription.id, fact };

/** An event as plain JSON, for brains across a wire. */
export const encodeEvent = Schema.encodeSync(Event);

/** The inverse of {@link encodeEvent}. */
export const decodeEvent = Schema.decodeUnknownSync(Event);
