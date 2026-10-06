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
 * An agent's brain: the facts it has extracted from its conversations (an RDF store), the triggers that
 * connect facts to the goals people asked it to watch, and the means to wake a chat when one fires.
 *
 * One brain per agent, keyed by the agent's entity id. Implementations differ per platform: in memory
 * in the client (`BrainMemory`), a Durable Object with SQLite on EDGE.
 *
 * TODO(dmaretskyi): Reshape as a durable outbox — `push(facts)`, one-time `query(facts)`, `register(regId, meta)`,
 * `subscribe(regId, to)`, `take(regId): Event[]`, `ack(regId, eventIds)`, `unsubscribe(regId)` — so consumers pull
 * matched events instead of the brain waking chats itself.
 */
export interface Service {
  /** Appends facts to the agent's store; facts already stored are kept once. */
  readonly addFacts: (agent: string, facts: readonly RDF.Fact[]) => Effect.Effect<void, BrainError>;

  /** The agent's facts matching the query. */
  readonly queryFacts: (agent: string, query: FactQuery) => Effect.Effect<RDF.Fact[], BrainError>;

  /** Adds or replaces a trigger; false when the agent already holds {@link MAX_TRIGGERS} others. */
  readonly putTrigger: (trigger: Trigger.Trigger) => Effect.Effect<boolean, BrainError>;

  /** The agent's triggers, oldest first. */
  readonly listTriggers: (agent: string) => Effect.Effect<Trigger.Trigger[], BrainError>;

  /** Removes a trigger by id; false when it was already gone, so only one caller acts on a one-time trigger. */
  readonly removeTrigger: (id: string) => Effect.Effect<boolean, BrainError>;

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
 * Most triggers an agent holds at once: ongoing triggers never fire away, so without a cap the store
 * (and the end-of-turn scan over it) would grow with every watch an agent is asked for.
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
