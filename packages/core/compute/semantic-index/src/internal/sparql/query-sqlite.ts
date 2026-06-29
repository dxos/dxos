//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as Statement from '@effect/sql/Statement';
import * as Effect from 'effect/Effect';

import { SemanticIndexError } from '../../errors';
import { type Fact } from '../../types';
import { type Row, rowToQuad } from '../source/sqlite-source';
import { FACT, entityIri, prov, sx } from '../vocab';
import { triplesToFacts } from './mapping';
import { type SemanticQuery } from './query-builder';

/**
 * Execute a structured {@link SemanticQuery} directly over the SQLite `triples` table — no SPARQL
 * engine (no Comunica). The SQLite-backed analogue of {@link queryMemory}: find the fact-node
 * subjects matching each constraint, intersect them, then fetch and reassemble each node's triples.
 */
export const querySqlite = (
  sql: SqlClient.SqlClient,
  query: SemanticQuery,
): Effect.Effect<Fact[], SemanticIndexError> =>
  Effect.gen(function* () {
    const subjects = (where: Statement.Fragment) =>
      sql<{ s: string }>`SELECT DISTINCT s FROM triples WHERE ${where}`.pipe(
        Effect.map((rows) => new Set(rows.map((row) => row.s))),
      );

    let nodes: Set<string> | undefined;
    const restrict = (set: Set<string>) => {
      nodes = nodes ? new Set([...nodes].filter((iri) => set.has(iri))) : set;
    };

    if (query.subjectEntity) {
      restrict(
        yield* subjects(
          sql`p = ${sx('subject').value} AND o = ${entityIri(query.subjectEntity).value} AND oType = 'iri'`,
        ),
      );
    }
    if (query.predicate) {
      // Fuzzy predicate match (case-insensitive substring, both directions), same as queryMemory —
      // the LLM rarely reproduces the stored verb phrase verbatim.
      const needle = query.predicate.trim().toLowerCase();
      const rows = yield* sql<{ s: string; o: string }>`SELECT s, o FROM triples WHERE p = ${sx('predicate').value}`;
      const matches = rows.filter((row) => {
        const value = row.o.trim().toLowerCase();
        return value.includes(needle) || needle.includes(value);
      });
      restrict(new Set(matches.map((row) => row.s)));
    }
    if (query.source) {
      restrict(yield* subjects(sql`p = ${prov('wasDerivedFrom').value} AND o = ${query.source} AND oType = 'literal'`));
    }
    if (query.entity) {
      const iri = entityIri(query.entity).value;
      restrict(
        yield* subjects(
          sql`(p = ${sx('subject').value} OR p = ${sx('object').value}) AND o = ${iri} AND oType = 'iri'`,
        ),
      );
    }

    // No constraints → every fact node (subjects under the fact IRI namespace).
    const factNodes =
      nodes ??
      (yield* sql<{ s: string }>`SELECT DISTINCT s FROM triples WHERE s LIKE ${FACT + '%'}`.pipe(
        Effect.map((rows) => new Set(rows.map((row) => row.s))),
      ));

    if (factNodes.size === 0) {
      return [];
    }

    const ids = [...factNodes];
    const rows = yield* sql<Row>`SELECT s, p, o, oType, g FROM triples WHERE ${sql.in('s', ids)}`;
    const facts = yield* Effect.try({
      try: () => triplesToFacts(rows.map(rowToQuad)),
      catch: (cause) => new SemanticIndexError({ message: 'Failed to reassemble facts', cause }),
    });

    if (query.minConfidence === undefined) {
      return facts;
    }
    const min = query.minConfidence;
    return facts.filter((fact) => (fact.valence.confidence ?? 0) >= min);
  }).pipe(
    Effect.mapError((cause) =>
      cause instanceof SemanticIndexError ? cause : new SemanticIndexError({ message: 'Failed to query facts', cause }),
    ),
  );
