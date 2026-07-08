//
// Copyright 2026 DXOS.org
//

import { DataFactory, type Store } from 'n3';

import { type Fact } from '../../types';
import { FACT, entityIri, prov, sx } from '../vocab';
import { triplesToFacts } from './mapping';
import { normalizePredicate } from './normalize-predicate';
import { type SemanticQuery } from './query-builder';

const { literal, namedNode } = DataFactory;

/**
 * Execute a structured {@link SemanticQuery} directly over an N3 {@link Store} via `getQuads` — no
 * SPARQL engine. This is the browser-safe equivalent of the Comunica-backed query path: it finds the
 * fact nodes matching each constraint, intersects them, then reassembles each node's triples.
 */
export const queryMemory = (store: Store, query: SemanticQuery): Fact[] => {
  const subjectsMatching = (predicate: ReturnType<typeof sx>, object: ReturnType<typeof entityIri>) =>
    new Set(store.getQuads(null, predicate, object, null).map((quad) => quad.subject.value));

  let nodes: Set<string> | undefined;
  const restrict = (set: Set<string>) => {
    nodes = nodes ? new Set([...nodes].filter((iri) => set.has(iri))) : set;
  };

  if (query.subjectEntity) {
    restrict(subjectsMatching(sx('subject'), entityIri(query.subjectEntity)));
  }
  if (query.predicate) {
    // Match on the normalized relation key (case/inflection/auxiliary variants collapse), then keep a
    // substring fallback in either direction, since the LLM rarely reproduces the verb phrase verbatim.
    const needle = normalizePredicate(query.predicate);
    const matches = store
      .getQuads(null, sx('predicate'), null, null)
      .filter((quad) => {
        const value = normalizePredicate(quad.object.value);
        return value === needle || value.includes(needle) || needle.includes(value);
      })
      .map((quad) => quad.subject.value);
    restrict(new Set(matches));
  }
  if (query.source) {
    restrict(
      new Set(store.getQuads(null, prov('wasDerivedFrom'), literal(query.source), null).map((q) => q.subject.value)),
    );
  }
  if (query.entity) {
    const iri = entityIri(query.entity);
    restrict(new Set([...subjectsMatching(sx('subject'), iri), ...subjectsMatching(sx('object'), iri)]));
  }

  // No constraints → every fact node (subjects under the fact IRI namespace).
  const factNodes =
    nodes ??
    new Set(
      store
        .getQuads(null, null, null, null)
        .map((quad) => quad.subject.value)
        .filter((iri) => iri.startsWith(FACT)),
    );

  const quads = [...factNodes].flatMap((iri) => store.getQuads(namedNode(iri), null, null, null));
  const facts = triplesToFacts(quads);
  if (query.minConfidence === undefined) {
    return facts;
  }
  const min = query.minConfidence;
  return facts.filter((fact) => (fact.factuality.confidence ?? 0) >= min);
};
