//
// Copyright 2026 DXOS.org
//

import { type AsyncIterator, wrap } from 'asynciterator';
import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';
import type * as Statement from 'effect/sql/Statement';
import { DataFactory, type Quad, type Term as RdfTerm } from 'n3';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Vocab from '../../types/Vocab.ts';

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

/** Cloudflare Durable Object SQLite binds at most 100 parameters per statement, so id lists are bound in chunks below that. */
const MAX_IDS_PER_STATEMENT = 40;

const chunks = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

/**
 * Runs `select` over `ids` in chunks small enough to bind, and concatenates the results. `select` may bind each id
 * twice plus a few constants.
 */
export const selectChunked = <A, E, R>(
  ids: readonly string[],
  select: (chunk: readonly string[]) => Effect.Effect<readonly A[], E, R>,
): Effect.Effect<A[], E, R> =>
  Effect.forEach(chunks(ids, MAX_IDS_PER_STATEMENT), select).pipe(Effect.map((results) => results.flat()));

/** The rows of the named graphs `graphs`, their provenance in the default graph, and the ontology graph once. */
export const loadGraphRows = (
  sql: SqlClient.SqlClient,
  graphs: readonly string[],
): Effect.Effect<Row[], SqlError.SqlError> =>
  Effect.gen(function* () {
    const statements = yield* selectChunked(
      graphs,
      (chunk) => sql<Row>`
        SELECT s, p, o, oType, g FROM triples WHERE ${sql.in('g', chunk)} OR (g = '' AND ${sql.in('s', chunk)})`,
    );
    const ontology = yield* sql<Row>`SELECT s, p, o, oType, g FROM triples WHERE g = ${Vocab.ONTOLOGY_GRAPH}`;
    return [...statements, ...ontology];
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
    // Rows are materialized rather than streamed: `sql`…`.stream` dies with "executeStream not
    // implemented" on @effect/sql-sqlite-node, the client every node-side crawl and replay binds.
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
