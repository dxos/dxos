//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import * as Operation from '@dxos/compute/Operation';
import { FactStore, type SemanticIndexError, type SparqlTerm } from '@dxos/pipeline-rdf';

import { BrainOperation } from '#types';

import { AGENT_MAX_ROWS, trimForAgent } from './trim.ts';

export default BrainOperation.QuerySparql.pipe(Operation.withHandler(Effect.fn((input) => querySparql(input))));

/** The model-facing result of {@link BrainOperation.QuerySparql}. */
export type QuerySparqlResult = typeof BrainOperation.QuerySparql.output.Type;

/** Renders a term as the model would write it back into SPARQL: an IRI in angle brackets, a blank node as `_:id`. */
const formatSparqlTerm = (term: SparqlTerm): string => {
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
 * Runs a raw SPARQL SELECT against the space FactStore and trims its solutions for the model. Anything but a SELECT
 * fails with the store's {@link SemanticIndexError}. Named export so the read path is unit-testable without the
 * operation runtime.
 */
export const querySparql = ({
  sparql,
}: typeof BrainOperation.QuerySparql.input.Type): Effect.Effect<QuerySparqlResult, SemanticIndexError, FactStore> =>
  Effect.gen(function* () {
    const store = yield* FactStore;
    const solutions = yield* store.rows(sparql);
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
