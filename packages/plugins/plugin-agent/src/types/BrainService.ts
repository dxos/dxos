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
import { RDF } from '@dxos/pipeline-rdf';
import { ContentBlock } from '@dxos/types';

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
 * An event queued in a subscription's outbox: one wake of its rules (`@dxos/brain` `Evaluator`), with
 * the facts behind it. Events stay queued until acknowledged, so a consumer that fails between
 * {@link Service.take} and {@link Service.ack} sees them again.
 */
export const Event = Schema.Struct({
  /** Stable per subscription, wake and facts, so a fact pushed twice queues once. */
  id: Schema.String,
  subscription: Schema.String,
  /** The rules' wake label (`match` for a translated pattern), `achieved`, or a sub-goal id. */
  label: Schema.String,
  /** The facts behind the wake; empty for a wake the clock caused. */
  facts: Schema.Array(RDF.Fact),
  /** When it woke (ISO). */
  at: Schema.String,
});

export interface Event extends Schema.Schema.Type<typeof Event> {}

/** How far a source has been read into facts: the URI of its last item read (e.g. a chat's last message). */
export type ReadCursor = {
  /** URI of the source read (e.g. the chat). */
  readonly source: string;
  /** URI of the last item read; the next read starts after it. */
  readonly through: string;
};

export type PushOptions = {
  /** Speakers (entity ids) whose facts are stored but wake nothing on their own: an agent's own words must not wake it. */
  readonly quiet?: readonly string[];
  /**
   * Moves the source's read cursor with the facts, so the cursor is kept exactly as long as they are: a brain that
   * loses its facts (the in-memory one, on reload) also forgets what it read, and the source is read again.
   */
  readonly read?: ReadCursor;
};

/**
 * An agent's brain, in two halves.
 *
 * - Knowledge base: {@link Service.push} stores facts extracted from conversations (an RDF store) and
 *   {@link Service.query} reads them back.
 * - Event base: a subscription (a {@link Trigger.Trigger}) carries goal rules; whenever pushed facts or the
 *   clock wake them, an event is queued in that subscription's own outbox, which its consumer drains with
 *   {@link Service.take} and {@link Service.ack}.
 *
 * Both implementations evaluate rules with `@dxos/brain`'s `Evaluator`, so a subscription wakes the same
 * way wherever the agent runs.
 *
 * One brain per agent, keyed by the agent's entity id. Implementations differ per platform: in memory
 * in the client (`BrainMemory`), a Durable Object with SQLite on EDGE.
 */
export interface Service {
  /**
   * Stores facts (one copy each), moves the read cursor when given, and queues an event in every matching
   * subscription's outbox; returns how many events were queued. A push with no facts only moves the cursor.
   */
  readonly push: (
    agent: string,
    facts: readonly RDF.Fact[],
    options?: PushOptions,
  ) => Effect.Effect<number, BrainError>;

  /**
   * Re-evaluates the agent's time-driven rules (`elapsed`, `every`, `due`) now; returns how many events
   * were queued. Hosts call it when {@link Service.nextDueAt} comes round.
   */
  readonly tick: (agent: string) => Effect.Effect<number, BrainError>;

  /** When the agent's rules next read the clock (ISO), or `undefined` when none do. */
  readonly nextDueAt: (agent: string) => Effect.Effect<string | undefined, BrainError>;

  /** The agent's facts matching the query. */
  readonly query: (agent: string, query: FactQuery) => Effect.Effect<RDF.Fact[], BrainError>;

  /** The URI of the last item of the source read into the agent's facts ({@link PushOptions.read}), if any. */
  readonly readThrough: (agent: string, source: string) => Effect.Effect<string | undefined, BrainError>;

  /**
   * Adds or replaces a subscription; it wakes on facts pushed from then on (its rules may read earlier
   * ones). False when the agent already holds {@link MAX_TRIGGERS} others; fails when its rules do not compile.
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

/** The brain's view of a trigger: its id, rules and start. */
export const toSubscription = (trigger: Trigger.Trigger): { id: string; rules: string; createdAt: string } => ({
  id: trigger.id,
  rules: Trigger.rulesOf(trigger),
  createdAt: trigger.createdAt,
});

/** An evaluator event as a queued {@link Event}. */
export const fromEvaluator = (event: {
  readonly id: string;
  readonly subscription: string;
  readonly label: string;
  readonly facts: ReadonlyArray<RDF.Fact>;
  readonly at: number;
}): Event => ({
  id: event.id,
  subscription: event.subscription,
  label: event.label,
  facts: [...event.facts],
  at: new Date(event.at).toISOString(),
});

/** The text of a fact's subject or object. */
export const termText = (term: RDF.Term): string =>
  term.kind === 'entity' ? (term.label ?? term.entity) : term.literal;

/** A fact as one line: subject, predicate, object. */
export const factText = (fact: RDF.Fact): string =>
  `${termText(fact.assertion.subject)} ${fact.assertion.predicate} ${termText(fact.assertion.object)}`;

/** An event as plain JSON, for brains across a wire. */
export const encodeEvent = Schema.encodeSync(Event);

/** The inverse of {@link encodeEvent}. */
export const decodeEvent = Schema.decodeUnknownSync(Event);
