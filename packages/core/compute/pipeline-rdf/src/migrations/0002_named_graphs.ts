//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import * as Ontology from '../types/Ontology.ts';
import * as Vocab from '../types/Vocab.ts';

type Row = { s: string; p: string; o: string; oType: string };

const SX_SUBJECT = `${Vocab.SX}subject`;
const SX_PREDICATE = `${Vocab.SX}predicate`;
const SX_OBJECT = `${Vocab.SX}object`;
const SX_SUBJECT_LABEL = `${Vocab.SX}subjectLabel`;
const SX_OBJECT_LABEL = `${Vocab.SX}objectLabel`;
const PROV_ATTRIBUTED = `${Vocab.PROV}wasAttributedTo`;
const REIFIED = [SX_SUBJECT, SX_PREDICATE, SX_OBJECT, SX_SUBJECT_LABEL, SX_OBJECT_LABEL];

/** A reified entity IRI wrapped an absolute IRI (a member's DID) as a slug; it is now stored as itself. */
const unwrap = (iri: string): string => Vocab.entityNode(Vocab.entityKey(iri)).value;

/**
 * Rewrites every reified fact as a one-statement named graph: the fact node becomes the graph, its subject,
 * predicate and object become a triple inside it, and its entity labels become `rdfs:label`s there. The graph keeps
 * the fact node's IRI, so the fact keeps its id. A predicate the ontology does not define gets its label in the
 * ontology graph.
 *
 * Written in TypeScript because the predicate IRI comes from the ontology's relation key, which SQL cannot compute.
 * Runs inside the migrator's transaction.
 */
export const migrateNamedGraphs: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* sql<Row>`
    SELECT s, p, o, oType FROM triples WHERE g = '' AND s LIKE ${`${Vocab.FACT}%`} AND ${sql.in('p', [...REIFIED, PROV_ATTRIBUTED])}`;
  const facts = new Map<string, Map<string, Row>>();
  for (const row of rows) {
    const props = facts.get(row.s) ?? new Map<string, Row>();
    props.set(row.p, row);
    facts.set(row.s, props);
  }

  const insert = (s: string, p: string, o: string, oType: string, g: string) =>
    sql`INSERT INTO triples (s, p, o, oType, g) VALUES (${s}, ${p}, ${o}, ${oType}, ${g})
        ON CONFLICT(s, p, o, oType, g) DO NOTHING`;

  for (const [graph, props] of facts) {
    const subject = props.get(SX_SUBJECT);
    const predicate = props.get(SX_PREDICATE);
    const object = props.get(SX_OBJECT);
    if (!subject || !predicate || !object) {
      continue;
    }
    // RDF has no literal subjects, so a literal subject becomes the entity it names (as `factToTriples` writes it).
    const subjectNode = subject.oType === 'iri' ? unwrap(subject.o) : Vocab.entityIri(subject.o).value;
    const objectNode = object.oType === 'iri' ? unwrap(object.o) : object.o;
    const entry = Ontology.DEFAULT.resolve(predicate.o);
    yield* insert(subjectNode, entry.iri, objectNode, object.oType, graph);
    if (!Ontology.DEFAULT.get(entry.iri)) {
      yield* insert(entry.iri, Vocab.RDFS_LABEL, predicate.o, 'literal', Vocab.ONTOLOGY_GRAPH);
    }
    const subjectLabel = props.get(SX_SUBJECT_LABEL)?.o ?? (subject.oType === 'literal' ? subject.o : undefined);
    if (subjectLabel !== undefined) {
      yield* insert(subjectNode, Vocab.RDFS_LABEL, subjectLabel, 'literal', graph);
    }
    const objectLabel = props.get(SX_OBJECT_LABEL)?.o;
    if (objectLabel !== undefined && object.oType === 'iri') {
      yield* insert(objectNode, Vocab.RDFS_LABEL, objectLabel, 'literal', graph);
    }
    yield* insert(graph, Vocab.RDF_TYPE, Vocab.SX_GRAPH, 'iri', '');
    const agent = props.get(PROV_ATTRIBUTED);
    if (agent && unwrap(agent.o) !== agent.o) {
      yield* sql`DELETE FROM triples WHERE s = ${graph} AND p = ${PROV_ATTRIBUTED} AND g = ''`;
      yield* insert(graph, PROV_ATTRIBUTED, unwrap(agent.o), 'iri', '');
    }
  }

  yield* sql`DELETE FROM triples WHERE g = '' AND s LIKE ${`${Vocab.FACT}%`} AND ${sql.in('p', REIFIED)}`;
});
