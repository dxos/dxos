//
// Copyright 2026 DXOS.org
//

import { DataFactory, type Quad, type Store } from 'n3';

import { type Fact } from '../../types/index.ts';
import * as Mapping from '../../types/Mapping.ts';
import * as Ontology from '../../types/Ontology.ts';
import * as Vocab from '../../types/Vocab.ts';
import { matchingPredicates, statementMatches } from './match.ts';
import { type SemanticQuery } from './query-builder.ts';

const { literal, namedNode, defaultGraph } = DataFactory;

const isStatement = (quad: Quad) =>
  quad.graph.termType === 'NamedNode' &&
  quad.graph.value !== Vocab.ONTOLOGY_GRAPH &&
  quad.predicate.value !== Vocab.RDFS_LABEL &&
  !Mapping.isKindQuad(quad.predicate.value, quad.object.value);

/** Whether a node is the entity a key names: an IRI exactly, a slug as the graph-local entity of any graph. */
const isEntity = (node: Quad['subject'] | Quad['object'], key: string): boolean =>
  node.termType === 'NamedNode' &&
  (node.value === Vocab.entityNode(key).value ||
    (!Vocab.isIri(key) && node.value.endsWith(Vocab.localEntitySuffix(key))));

/** Every stored quad of the given graphs: their statements, their provenance, and the ontology graph. */
export const graphQuads = (store: Store, graphs: Iterable<string>): Quad[] =>
  [...graphs].flatMap((iri) => [
    ...store.getQuads(null, null, null, namedNode(iri)),
    ...store.getQuads(namedNode(iri), null, null, defaultGraph()),
  ]);

/**
 * Execute a structured {@link SemanticQuery} directly over an N3 {@link Store} via `getQuads` — no
 * SPARQL engine. This is the browser-safe equivalent of the Comunica-backed query path: it finds the
 * named graphs holding a statement that matches each constraint, intersects them, then reassembles them.
 */
export const queryMemory = (
  store: Store,
  query: SemanticQuery,
  ontology: Ontology.Ontology = Ontology.DEFAULT,
): Fact[] => {
  const graphsOf = (quads: Quad[]) => new Set(quads.filter(isStatement).map((quad) => quad.graph.value));

  let graphs: Set<string> | undefined;
  const restrict = (set: Set<string>) => {
    graphs = graphs ? new Set([...graphs].filter((iri) => set.has(iri))) : set;
  };

  if (query.subjectEntity) {
    const subject = query.subjectEntity;
    restrict(graphsOf(store.getQuads(null, null, null, null).filter((quad) => isEntity(quad.subject, subject))));
  }
  let predicates: Set<string> | undefined;
  if (query.predicate) {
    const labels = new Map(
      store
        .getQuads(null, namedNode(Vocab.RDFS_LABEL), null, namedNode(Vocab.ONTOLOGY_GRAPH))
        .map((quad) => [quad.subject.value, quad.object.value]),
    );
    const stored = new Set(
      store
        .getQuads(null, null, null, null)
        .filter(isStatement)
        .map((quad) => quad.predicate.value),
    );
    predicates = matchingPredicates(
      query.predicate,
      new Map(
        [...stored].map((iri) => [iri, labels.get(iri) ?? ontology.get(iri)?.label ?? Ontology.labelFromIri(iri)]),
      ),
      ontology,
    );
    restrict(graphsOf([...predicates].flatMap((iri) => store.getQuads(null, namedNode(iri), null, null))));
  }
  if (query.source) {
    restrict(
      new Set(
        store
          .getQuads(null, Vocab.prov('wasDerivedFrom'), literal(query.source), defaultGraph())
          .map((quad) => quad.subject.value),
      ),
    );
  }
  if (query.entity) {
    const entity = query.entity;
    restrict(
      graphsOf(
        store
          .getQuads(null, null, null, null)
          .filter((quad) => isEntity(quad.subject, entity) || isEntity(quad.object, entity)),
      ),
    );
  }

  // No constraints → every stored graph.
  const candidates =
    graphs ??
    new Set(
      store
        .getQuads(null, namedNode(Vocab.RDF_TYPE), namedNode(Vocab.SX_GRAPH), defaultGraph())
        .map((quad) => quad.subject.value),
    );

  const quads = [
    ...graphQuads(store, candidates),
    ...store.getQuads(null, null, null, namedNode(Vocab.ONTOLOGY_GRAPH)),
  ];
  return Mapping.triplesToFacts(quads, ontology).filter((fact) => statementMatches(fact, query, predicates));
};
