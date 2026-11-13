//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { RDF } from '@dxos/pipeline-rdf';

/**
 * The only state genuinely shared across the Facts-story modules: the currently-displayed facts (a
 * view — a crawl/file-load produces the full set, a SPARQL run a filtered subset) and the selected
 * entity and predicate. The `FactStore` itself (persistence) is Brain's per-space registry; this context is the
 * cross-module display/selection the {@link ModuleContainer} surfaces read and write.
 */
export type FactsStoryState = {
  facts: RDF.Fact[];
  setFacts: (facts: RDF.Fact[]) => void;
  /** The selected entity slug scoping the viewer, or undefined for all. */
  selected: string | undefined;
  setSelected: (selected: string | undefined) => void;
  /** The predicate scoping the viewer, or undefined for all. */
  predicate: PredicateFilter | undefined;
  setPredicate: (predicate: PredicateFilter | undefined) => void;
};

/** A predicate the facts view is scoped to: its IRI, and every IRI a fact may state it with (its equivalents). */
export type PredicateFilter = {
  iri: string;
  iris: ReadonlySet<string>;
};

/** Whether a fact states the filter's predicate (or one equivalent to it). */
export const matchesPredicate = (fact: RDF.Fact, predicate: PredicateFilter): boolean =>
  predicate.iris.has(RDF.Mapping.predicateOf(fact));

export const FactsStoryContext = createContext<FactsStoryState | undefined>(undefined);

/** Shared facts-story view state; throws if used outside the story provider. */
export const useFactsStory = (): FactsStoryState => {
  const context = useContext(FactsStoryContext);
  if (!context) {
    throw new Error('useFactsStory must be used within a FactsStoryContext provider');
  }
  return context;
};
