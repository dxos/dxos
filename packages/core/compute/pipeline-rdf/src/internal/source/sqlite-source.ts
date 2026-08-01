//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import type * as Statement from '@effect/sql/Statement';
import { type AsyncIterator, wrap } from 'asynciterator';
import * as Effect from 'effect/Effect';
import { DataFactory, type Quad, type Term as RdfTerm } from 'n3';

import { EffectEx } from '@dxos/effect';

const { namedNode, literal, quad, defaultGraph } = DataFactory;

export type Row = { s: string; p: string; o: string; oType: string; g: string };

export const rowToQuad = (row: Row): Quad => {
  const object: RdfTerm = row.oType === 'iri' ? namedNode(row.o) : literal(row.o);
  const graph = row.g === '' ? defaultGraph() : namedNode(row.g);
  return quad(namedNode(row.s), namedNode(row.p), object, graph);
};

const objectColumn = (object: RdfTerm) => ({
  value: object.value,
  oType: object.termType === 'Literal' ? 'literal' : 'iri',
});

/** Persist quads as rows in the `triples` table. The batch is wrapped in a single transaction
 *  so partial failure rolls back; duplicate quads are ignored via the `triples_unique` constraint. */
export const insertQuads = (sql: SqlClient.SqlClient, quads: readonly Quad[]): Effect.Effect<void, SqlError.SqlError> =>
  sql.withTransaction(
    Effect.forEach(
      quads,
      (q) => {
        const obj = objectColumn(q.object);
        const graph = q.graph.termType === 'DefaultGraph' ? '' : q.graph.value;
        return sql`INSERT INTO triples (s, p, o, oType, g) VALUES (${q.subject.value}, ${q.predicate.value}, ${obj.value}, ${obj.oType}, ${graph}) ON CONFLICT(s, p, o, oType, g) DO NOTHING`;
      },
      { discard: true },
    ),
  );

/** A pattern position is bound when it is a concrete term rather than a variable or wildcard. */
const bound = (term: RdfTerm | null | undefined): term is RdfTerm => !!term && term.termType !== 'Variable';

/**
 * RDF/JS Source backed by the `triples` table. Comunica calls match() synchronously and
 * consumes the returned stream; the SQL runs eagerly and its rows are streamed via `wrap`,
 * which accepts the pending `Promise<Quad[]>` and emits each element as a stream item.
 */
export const makeSqliteSource = (sql: SqlClient.SqlClient) => {
  const run = (s: RdfTerm | null, p: RdfTerm | null, o: RdfTerm | null, g: RdfTerm | null): Promise<Quad[]> => {
    const filters: Statement.Fragment[] = [];
    if (bound(s)) {
      filters.push(sql`s = ${s.value}`);
    }
    if (bound(p)) {
      filters.push(sql`p = ${p.value}`);
    }
    if (bound(o)) {
      filters.push(sql`o = ${o.value}`);
      // Disambiguate a bound object by term kind so an IRI does not match a literal of the same lexical value.
      filters.push(sql`oType = ${o.termType === 'NamedNode' ? 'iri' : 'literal'}`);
    }
    if (bound(g)) {
      filters.push(sql`g = ${g.termType === 'DefaultGraph' ? '' : g.value}`);
    }
    const query = filters.length
      ? sql<Row>`SELECT s, p, o, oType, g FROM triples WHERE ${sql.and(filters)}`
      : sql<Row>`SELECT s, p, o, oType, g FROM triples`;
    return EffectEx.runPromise(query.pipe(Effect.map((rows) => rows.map(rowToQuad))));
  };

  return {
    match(s: RdfTerm | null, p: RdfTerm | null, o: RdfTerm | null, g: RdfTerm | null): AsyncIterator<Quad> {
      return wrap(run(s, p, o, g));
    },
  };
};
