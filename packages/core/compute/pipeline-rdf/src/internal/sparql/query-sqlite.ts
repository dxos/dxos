//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/sql/SqlClient';
import type * as Statement from 'effect/sql/Statement';

import { SemanticIndexError } from '../../errors.ts';
import { type Fact } from '../../types/index.ts';
import * as Mapping from '../../types/Mapping.ts';
import * as Ontology from '../../types/Ontology.ts';
import * as Vocab from '../../types/Vocab.ts';
import { type Row, rowToQuad } from '../source/sqlite-source.ts';
import { matchingPredicates, statementMatches } from './match.ts';
import { type SemanticQuery } from './query-builder.ts';

/**
 * Execute a structured {@link SemanticQuery} directly over the SQLite `triples` table — no SPARQL
 * engine (no Comunica). The SQLite-backed analogue of {@link queryMemory}: find the named graphs holding
 * a statement that matches each constraint, intersect them, then fetch and reassemble those graphs.
 */
export const querySqlite = (
  sql: SqlClient.SqlClient,
  query: SemanticQuery,
  ontology: Ontology.Ontology = Ontology.DEFAULT,
): Effect.Effect<Fact[], SemanticIndexError> =>
  Effect.gen(function* () {
    // Rows that are statements, not provenance, predicate metadata, or an entity's label or kind.
    const statement = sql`g <> '' AND g <> ${Vocab.ONTOLOGY_GRAPH} AND p <> ${Vocab.RDFS_LABEL}
      AND NOT (p = ${Vocab.RDF_TYPE} AND ${sql.in('o', [...Mapping.KIND_CLASSES])})`;
    // An entity slug names the graph-local entity of that slug in every graph (and its pre-local `entity:` IRI).
    const isEntity = (column: 's' | 'o', key: string) => {
      const node = Vocab.entityNode(key).value;
      if (Vocab.isIri(key)) {
        return sql`${sql(column)} = ${node}`;
      }
      const suffix = Vocab.localEntitySuffix(key);
      return sql`(${sql(column)} = ${node} OR substr(${sql(column)}, ${-suffix.length}) = ${suffix})`;
    };
    const graphsWhere = (where: Statement.Fragment) =>
      sql<{ g: string }>`SELECT DISTINCT g FROM triples WHERE ${statement} AND ${where}`.pipe(
        Effect.map((rows) => new Set(rows.map((row) => row.g))),
      );

    let graphs: Set<string> | undefined;
    const restrict = (set: Set<string>) => {
      graphs = graphs ? new Set([...graphs].filter((iri) => set.has(iri))) : set;
    };

    if (query.subjectEntity) {
      restrict(yield* graphsWhere(isEntity('s', query.subjectEntity)));
    }
    let predicates: Set<string> | undefined;
    if (query.predicate) {
      const stored = yield* sql<{ p: string }>`SELECT DISTINCT p FROM triples WHERE ${statement}`;
      const labels = yield* sql<{ s: string; o: string }>`
        SELECT s, o FROM triples WHERE g = ${Vocab.ONTOLOGY_GRAPH} AND p = ${Vocab.RDFS_LABEL}`;
      const labelOf = new Map(labels.map((row) => [row.s, row.o]));
      predicates = matchingPredicates(
        query.predicate,
        new Map(
          stored.map(({ p }) => [p, labelOf.get(p) ?? ontology.get(p)?.label ?? Ontology.labelFromIri(p)] as const),
        ),
        ontology,
      );
      restrict(yield* graphsWhere(sql.in('p', [...predicates])));
    }
    if (query.source) {
      const rows = yield* sql<{ s: string }>`
        SELECT s FROM triples WHERE g = '' AND p = ${Vocab.prov('wasDerivedFrom').value}
          AND o = ${query.source} AND oType = 'literal'`;
      restrict(new Set(rows.map((row) => row.s)));
    }
    if (query.entity) {
      restrict(
        yield* graphsWhere(sql`(${isEntity('s', query.entity)} OR (${isEntity('o', query.entity)} AND oType = 'iri'))`),
      );
    }

    // No constraints → every stored graph.
    const candidates =
      graphs ??
      (yield* sql<{ s: string }>`
        SELECT s FROM triples WHERE g = '' AND p = ${Vocab.RDF_TYPE} AND o = ${Vocab.SX_GRAPH}`.pipe(
        Effect.map((rows) => new Set(rows.map((row) => row.s))),
      ));

    if (candidates.size === 0) {
      return [];
    }

    const ids = [...candidates];
    const rows = yield* sql<Row>`
      SELECT s, p, o, oType, g FROM triples
      WHERE ${sql.in('g', ids)} OR (g = '' AND ${sql.in('s', ids)}) OR g = ${Vocab.ONTOLOGY_GRAPH}`;
    const facts = yield* Effect.try({
      try: () => Mapping.triplesToFacts(rows.map(rowToQuad), ontology),
      catch: (cause) => new SemanticIndexError({ message: 'Failed to reassemble facts', cause }),
    });
    return facts.filter((fact) => statementMatches(fact, query, predicates));
  }).pipe(
    Effect.mapError((cause) =>
      cause instanceof SemanticIndexError ? cause : new SemanticIndexError({ message: 'Failed to query facts', cause }),
    ),
  );
