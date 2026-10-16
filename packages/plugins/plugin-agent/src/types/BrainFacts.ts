//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Agent from '@dxos/assistant/Agent';
import { Database, Filter, type Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { FactStore, type FactStoreApi, RDF, SemanticIndexError } from '@dxos/pipeline-rdf';

import * as BrainService from './BrainService.ts';

/**
 * Facts ingested outside a conversation (a mailbox, a crawl) belong to one agent's brain, so the caller must say whose.
 */
export class NoTargetAgentError extends BaseError.extend('NoTargetAgentError', 'No agent holds these facts.') {}

/** The named agent; fails when none is named, since a write must not guess which brain it lands in. */
export const requireAgent = Effect.fnUntraced(function* (ref: Ref.Ref<Agent.Agent> | undefined) {
  if (!ref) {
    return yield* Effect.fail(new NoTargetAgentError({ message: 'Pass the agent whose brain holds the facts.' }));
  }
  return yield* Database.load(ref);
});

/** The named agent, else the space's only agent: a read from a space with one agent needs no naming. */
export const resolveAgent = Effect.fnUntraced(function* (ref: Ref.Ref<Agent.Agent> | undefined) {
  if (ref) {
    return yield* Database.load(ref);
  }
  const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
  if (agents.length !== 1) {
    return yield* Effect.fail(
      new NoTargetAgentError({ message: `Pass the agent to read; the space has ${agents.length}.` }),
    );
  }
  return agents[0];
});

const toIndexError = (error: BrainService.BrainError) =>
  new SemanticIndexError({ message: error.message, cause: error });

/**
 * The agent's brain as a pipeline-rdf {@link FactStoreApi}, so fact pipelines (email, Discord, documents) write into it
 * unchanged. Writes are store-only: bulk ingestion wakes no subscription. A brain answers structured queries only, so
 * `select` (raw SPARQL) fails.
 */
export const factStore = (brain: BrainService.Service, agent: string): FactStoreApi => ({
  putFacts: (facts) => brain.push(agent, facts, { storeOnly: true }).pipe(Effect.asVoid, Effect.mapError(toIndexError)),
  predicates: () =>
    brain.query(agent, {}).pipe(
      Effect.map((facts) => [...RDF.Ontology.DEFAULT.entries, ...RDF.Graph.mintedPredicates(facts)]),
      Effect.mapError(toIndexError),
    ),
  query: (query) => brain.query(agent, query).pipe(Effect.mapError(toIndexError)),
  select: () => Effect.fail(new SemanticIndexError({ message: 'The agent brain answers structured queries only.' })),
  cursor: (source) => brain.readThrough(agent, source).pipe(Effect.mapError(toIndexError)),
  setCursor: (source, through) =>
    brain.push(agent, [], { read: { source, through } }).pipe(Effect.asVoid, Effect.mapError(toIndexError)),
  clear: () => brain.reset(agent).pipe(Effect.mapError(toIndexError)),
});

/** {@link factStore} as a layer over the host's brain. */
export const layer = (agent: string): Layer.Layer<FactStore, never, BrainService.BrainService> =>
  Layer.effect(FactStore, BrainService.BrainService.pipe(Effect.map((brain) => factStore(brain, agent))));
