//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { BrainOperation } from '#types';

import { toCompactFact } from './facts.ts';
import { spaceFacts } from './space-facts.ts';

export default BrainOperation.QueryFacts.pipe(
  Operation.withHandler(
    Effect.fn(function* (input) {
      const facts = yield* queryCompactFacts(input);
      return { facts };
    }),
  ),
);

/**
 * Runs the structured query against the brains of the space's agents and projects the matches onto the compact
 * LLM-facing shape, bounded by `limit`. Named export so the read path is unit-testable without the operation runtime.
 */
export const queryCompactFacts = ({ limit, minConfidence, ...query }: typeof BrainOperation.QueryFacts.input.Type) =>
  Effect.gen(function* () {
    const facts = yield* spaceFacts(query);
    // The brain's query has no confidence bound; a fact without a confidence fails one.
    const bounded =
      minConfidence === undefined
        ? facts
        : facts.filter(
            ({ factuality }) => factuality.confidence !== undefined && factuality.confidence >= minConfidence,
          );
    return bounded.slice(0, limit ?? BrainOperation.DEFAULT_QUERY_FACTS_LIMIT).map(toCompactFact);
  });
