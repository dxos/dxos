//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { FactStore, type FactStoreApi, SemanticIndexError } from '@dxos/pipeline-rdf';
import * as RDF from '@dxos/pipeline-rdf/types';

import { BrainService } from '#types';

const toIndexError = (cause: BrainService.BrainError) => new SemanticIndexError({ message: cause.message, cause });

/**
 * One agent's brain seen as a pipeline-rdf {@link FactStore}, so the fact pipelines (mailbox analysis, the Discord
 * crawl) write into the agent's brain rather than a store of their own. Facts are pushed store-only, so bulk
 * ingestion wakes no subscription; the ingest cursor is the brain's read cursor.
 *
 * TODO(brain): The client's `BrainService` is the in-memory brain, so for an agent whose chats run on EDGE these facts
 *   land where its Knowledge panel does not look (that panel reads EDGE's brain). Route by the agent's location once
 *   the client can reach EDGE's brain.
 */
export const make = (brain: BrainService.Service, agent: string): FactStoreApi => ({
  putFacts: (facts) => brain.push(agent, facts, { storeOnly: true }).pipe(Effect.asVoid, Effect.mapError(toIndexError)),
  // The brain keeps no ontology graph, so the minted predicates are read off the facts that use them.
  predicates: () =>
    brain.query(agent, {}).pipe(
      Effect.map((facts) => [...RDF.Ontology.DEFAULT.include(RDF.Graph.mintedPredicates(facts)).entries]),
      Effect.mapError(toIndexError),
    ),
  query: ({ minConfidence, ...query }) =>
    brain.query(agent, query).pipe(
      // The brain's query has no confidence bound; a fact without a confidence fails one, as in the SPARQL store.
      Effect.map((facts) =>
        minConfidence === undefined
          ? facts
          : facts.filter(
              ({ factuality }) => factuality.confidence !== undefined && factuality.confidence >= minConfidence,
            ),
      ),
      Effect.mapError(toIndexError),
    ),
  select: () =>
    Effect.fail(new SemanticIndexError({ message: 'The agent brain answers structured queries, not raw SPARQL.' })),
  cursor: (source) => brain.readThrough(agent, source).pipe(Effect.mapError(toIndexError)),
  setCursor: (source, through) =>
    brain.push(agent, [], { read: { source, through } }).pipe(Effect.asVoid, Effect.mapError(toIndexError)),
  clear: () => brain.reset(agent).pipe(Effect.mapError(toIndexError)),
});

/** {@link make} over the ambient `BrainService`. */
export const layer = (agent: string): Layer.Layer<FactStore, never, BrainService.BrainService> =>
  Layer.effect(FactStore, BrainService.BrainService.pipe(Effect.map((brain) => make(brain, agent))));
