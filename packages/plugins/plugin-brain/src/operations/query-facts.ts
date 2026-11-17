//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { type FactStore, type SemanticIndexError } from '@dxos/pipeline-rdf';

import { BrainOperation } from '#types';

import { queryResolvedFacts, toCompactFact } from './facts.ts';
import { trimForAgent } from './trim.ts';

export default BrainOperation.QueryFacts.pipe(Operation.withHandler(Effect.fn((input) => queryCompactFacts(input))));

/** The model-facing result of {@link BrainOperation.QueryFacts}. */
export type QueryFactsResult = typeof BrainOperation.QueryFacts.output.Type;

/**
 * Runs the structured query against the space FactStore and projects the window `offset`..`offset + limit` of the
 * matches onto the compact LLM-facing shape, trimmed for the model. Named export so the read path is unit-testable
 * without the operation runtime.
 */
export const queryCompactFacts = ({
  limit,
  offset = 0,
  ...query
}: typeof BrainOperation.QueryFacts.input.Type): Effect.Effect<QueryFactsResult, SemanticIndexError, FactStore> =>
  Effect.gen(function* () {
    const facts = yield* queryResolvedFacts(query);
    const window = facts.slice(offset, offset + (limit ?? BrainOperation.DEFAULT_QUERY_FACTS_LIMIT)).map(toCompactFact);
    const { rows, note } = trimForAgent(window, {
      total: facts.length,
      offset,
      clipRow: (fact, clip) => ({ ...fact, subject: clip(fact.subject), object: clip(fact.object) }),
      paging: (next) => `Re-run with limit/offset (e.g. offset ${next}) to read the rest in windows.`,
    });
    return { facts: rows, total: facts.length, ...(note !== undefined ? { note } : {}) };
  });
