//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';

import { type Fact, Graph, Ontology } from '../types/index.ts';
import * as Predicate from '../types/Predicate.ts';
import { type DocumentFacts } from './extract-facts.ts';

export type NormalizeOptions = {
  /** Predicates to canonicalize onto: a surface form one names becomes its label and IRI. */
  readonly ontology?: Ontology.Ontology;
  /**
   * Synonym table: predicate (any inflection - keys are relation-key normalized) -> canonical
   * predicate. E.g. `{ 'employed by': 'works at', 'works for': 'works at' }`.
   */
  readonly synonyms?: Readonly<Record<string, string>>;
};

/**
 * Predicate-canonicalization stage: rewrites each fact's predicate to the synonym table's canonical form, then to
 * the ontology's predicate when it names one; a predicate neither knows keeps its surface form and the IRI it was
 * minted with.
 * The statements keep their graphs and get the ids their new predicates give them.
 */
export const normalizeFactsStage = ({
  ontology,
  synonyms = {},
}: NormalizeOptions): Stage.Stage<DocumentFacts, DocumentFacts> => {
  const lookup = new Map(Object.entries(synonyms).map(([key, value]) => [Predicate.normalize(key), value]));
  const vocabulary = ontology ?? Ontology.DEFAULT;
  const canonicalize = (fact: Fact): Fact => {
    const surface = lookup.get(Predicate.normalize(fact.assertion.predicate)) ?? fact.assertion.predicate;
    const entry = ontology?.find(surface);
    if (!entry && surface === fact.assertion.predicate) {
      // Neither table knows it: it keeps the IRI it was minted with, in its brain's namespace.
      return fact;
    }
    const resolved = entry ?? vocabulary.resolve(surface);
    if (resolved.label === fact.assertion.predicate && resolved.iri === fact.assertion.predicateIri) {
      return fact;
    }
    const { predicateDescription, ...assertion } = fact.assertion;
    return {
      ...fact,
      assertion: {
        ...assertion,
        predicate: entry?.label ?? surface,
        predicateIri: resolved.iri,
        ...(!entry && predicateDescription ? { predicateDescription } : {}),
      },
    };
  };
  return Stage.map('normalize-predicates', ({ doc, facts }: DocumentFacts) =>
    Effect.succeed({ doc, facts: Graph.assign(facts.map(canonicalize), { ontology: vocabulary }) }),
  );
};
