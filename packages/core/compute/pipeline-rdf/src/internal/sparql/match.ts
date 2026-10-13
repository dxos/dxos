//
// Copyright 2026 DXOS.org
//

import { type Fact, termValue } from '../../types/index.ts';
import * as Ontology from '../../types/Ontology.ts';
import * as Vocab from '../../types/Vocab.ts';
import { type SemanticQuery } from './query-builder.ts';

/**
 * The stored predicates a query's predicate names: those its surface form resolves to through the ontology, and
 * those whose label or synonyms share its relation key, either way round, since a model rarely reproduces the
 * stored phrase verbatim.
 */
export const matchingPredicates = (
  surface: string,
  predicates: ReadonlyMap<string, string>,
  ontology: Ontology.Ontology = Ontology.DEFAULT,
): Set<string> => {
  if (Vocab.isIri(surface)) {
    return new Set([surface]);
  }
  const needle = Ontology.key(surface);
  const matches = new Set([ontology.resolve(surface).iri]);
  for (const [iri, label] of predicates) {
    const entry = ontology.get(iri);
    const keys = [label, ...(entry ? [entry.name, ...(entry.synonyms ?? [])] : [])].map(Ontology.key);
    if (keys.some((key) => key === needle || key.includes(needle) || needle.includes(key))) {
      matches.add(iri);
    }
  }
  return matches;
};

/**
 * Whether a statement satisfies the query. Candidate graphs are found by any statement in them, so each statement
 * is checked again here: a graph about Rich may also hold a statement about DXOS.
 */
export const statementMatches = (fact: Fact, query: SemanticQuery, predicates?: ReadonlySet<string>): boolean => {
  const subject = termValue(fact.assertion.subject);
  const object = termValue(fact.assertion.object);
  return (
    (query.subjectEntity === undefined || subject === query.subjectEntity) &&
    (query.entity === undefined ||
      subject === query.entity ||
      (fact.assertion.object.kind === 'entity' && object === query.entity)) &&
    (predicates === undefined || predicates.has(fact.assertion.predicateIri ?? '')) &&
    (query.source === undefined || fact.attribution.source === query.source) &&
    (query.minConfidence === undefined || (fact.factuality.confidence ?? 0) >= query.minConfidence)
  );
};
