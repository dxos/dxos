//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { FactStore, type SemanticIndexError } from '@dxos/pipeline-rdf';

import { BrainOperation } from '#types';

import { toCompactFact } from './facts';

export default BrainOperation.QueryFacts.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      const facts = yield* queryCompactFacts(input);
      return { facts };
    }),
  ),
);

/**
 * Runs the structured query against the space FactStore and projects the matches onto the compact
 * LLM-facing shape, bounded by `limit`. Named export so the read path is unit-testable without the
 * operation runtime.
 */
export const queryCompactFacts = ({
  limit,
  ...query
}: typeof BrainOperation.QueryFacts.input.Type): Effect.Effect<
  BrainOperation.CompactFact[],
  SemanticIndexError,
  FactStore
> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const facts = yield* store.query(query);
    return facts.slice(0, limit ?? BrainOperation.DEFAULT_QUERY_FACTS_LIMIT).map(toCompactFact);
  });
