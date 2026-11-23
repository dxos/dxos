//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import * as Operation from '@dxos/compute/Operation';
import { type MemoryError, MemoryQuery, MemoryService } from '@dxos/echo-memory';

import { BrainOperation } from '#types';

import * as QueryLog from '../QueryLog.ts';
import { AGENT_MAX_ROWS, trimForAgent } from './trim.ts';

export default BrainOperation.QuerySparql.pipe(Operation.withHandler(Effect.fn((input) => querySparql(input))));

/** The model-facing result of {@link BrainOperation.QuerySparql}. */
export type QuerySparqlResult = typeof BrainOperation.QuerySparql.output.Type;

/** Renders a term as the model would write it back into SPARQL: an IRI in angle brackets, a blank node as `_:id`. */
const formatSparqlTerm = (term: MemoryQuery.SparqlTerm): string => {
  switch (term.termType) {
    case 'NamedNode':
      return `<${term.value}>`;
    case 'BlankNode':
      return `_:${term.value}`;
    case 'Literal':
      return term.language ? `${term.value}@${term.language}` : term.value;
  }
};

/** Matches a solution modifier `LIMIT n` anywhere in the query, which is enough to tell whether the model paged. */
const HAS_LIMIT = /\bLIMIT\s+\d+/i;

/**
 * Runs a raw SPARQL SELECT against the space memory and trims its solutions for the model. Anything but a SELECT
 * fails with a {@link MemoryError.MemoryError}. Named export so the read path is unit-testable without the
 * operation runtime.
 */
export const querySparql = ({
  sparql,
}: typeof BrainOperation.QuerySparql.input.Type): Effect.Effect<
  QuerySparqlResult,
  MemoryError.MemoryError,
  MemoryService.MemoryService
> =>
  Effect.gen(function* () {
    const memory = yield* MemoryService.MemoryService;
    // Logged, so the space's memory view follows the agent's queries as they run.
    const solutions = yield* QueryLog.track(memory, sparql, memory.query(MemoryQuery.sparql(sparql)), (rows) => rows);
    const limited = HAS_LIMIT.test(sparql);
    const { rows, note } = trimForAgent(solutions.map(Record.map(formatSparqlTerm)), {
      clipRow: (row, clip) => Record.map(row, clip),
      paging: () =>
        limited
          ? `Re-run with LIMIT/OFFSET to read the rest in windows of at most ${AGENT_MAX_ROWS}.`
          : `The query has no LIMIT: add LIMIT ${AGENT_MAX_ROWS} and re-run with OFFSET to read the rest in windows.`,
    });
    return { rows, total: solutions.length, ...(note !== undefined ? { note } : {}) };
  });
