//
// Copyright 2026 DXOS.org
//

import { DataFactory, type Store } from 'n3';

import { type Fact } from '../../types/index.ts';
import * as Mapping from '../../types/Mapping.ts';
import * as Predicate from '../../types/Predicate.ts';
import * as Vocab from '../../types/Vocab.ts';
import { type SemanticQuery } from './query-builder.ts';

const { literal, namedNode } = DataFactory;

/**
 * Execute a structured {@link SemanticQuery} directly over an N3 {@link Store} via `getQuads` — no
 * SPARQL engine. This is the browser-safe equivalent of the Comunica-backed query path: it finds the
 * fact nodes matching each constraint, intersects them, then reassembles each node's triples.
 */
export const queryMemory = (store: Store, query: SemanticQuery): Fact[] => {
  const subjectsMatching = (predicate: ReturnType<typeof Vocab.sx>, object: ReturnType<typeof Vocab.entityIri>) =>
    new Set(store.getQuads(null, predicate, object, null).map((quad) => quad.subject.value));

  let nodes: Set<string> | undefined;
  const restrict = (set: Set<string>) => {
    nodes = nodes ? new Set([...nodes].filter((iri) => set.has(iri))) : set;
  };

  if (query.subjectEntity) {
    restrict(subjectsMatching(Vocab.sx('subject'), Vocab.entityIri(query.subjectEntity)));
  }
  if (query.predicate) {
    // Match on the normalized relation key (case/inflection/auxiliary variants collapse), then keep a
    // substring fallback in either direction, since the LLM rarely reproduces the verb phrase verbatim.
    const needle = Predicate.normalize(query.predicate);
    const matches = store
      .getQuads(null, Vocab.sx('predicate'), null, null)
      .filter((quad) => {
        const value = Predicate.normalize(quad.object.value);
        return value === needle || value.includes(needle) || needle.includes(value);
      })
      .map((quad) => quad.subject.value);
    restrict(new Set(matches));
  }
  if (query.source) {
    restrict(
      new Set(
        store.getQuads(null, Vocab.prov('wasDerivedFrom'), literal(query.source), null).map((q) => q.subject.value),
      ),
    );
  }
  if (query.entity) {
    const iri = Vocab.entityIri(query.entity);
    restrict(new Set([...subjectsMatching(Vocab.sx('subject'), iri), ...subjectsMatching(Vocab.sx('object'), iri)]));
  }

  // No constraints → every fact node (subjects under the fact IRI namespace).
  const factNodes =
    nodes ??
    new Set(
      store
        .getQuads(null, null, null, null)
        .map((quad) => quad.subject.value)
        .filter((iri) => iri.startsWith(Vocab.FACT)),
    );

  const quads = [...factNodes].flatMap((iri) => store.getQuads(namedNode(iri), null, null, null));
  const facts = Mapping.triplesToFacts(quads);
  if (query.minConfidence === undefined) {
    return facts;
  }
  const min = query.minConfidence;
  return facts.filter((fact) => (fact.factuality.confidence ?? 0) >= min);
};
