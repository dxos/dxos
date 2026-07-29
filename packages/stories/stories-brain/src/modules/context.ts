//
// Copyright 2026 DXOS.org
//

import { createContext, useContext } from 'react';

import { type RDF } from '@dxos/pipeline-rdf';

/**
 * The only state genuinely shared across the Facts-story modules: the currently-displayed facts (a
 * view — a crawl/file-load produces the full set, a SPARQL run a filtered subset) and the selected
 * entity. The `FactStore` itself (persistence) is Brain's per-space registry; this context is the
 * cross-module display/selection the {@link ModuleContainer} surfaces read and write.
 */
export type FactsStoryState = {
  facts: RDF.Fact[];
  setFacts: (facts: RDF.Fact[]) => void;
  /** The selected entity slug scoping the viewer, or undefined for all. */
  selected: string | undefined;
  setSelected: (selected: string | undefined) => void;
};

export const FactsStoryContext = createContext<FactsStoryState | undefined>(undefined);

/** Shared facts-story view state; throws if used outside the story provider. */
export const useFactsStory = (): FactsStoryState => {
  const context = useContext(FactsStoryContext);
  if (!context) {
    throw new Error('useFactsStory must be used within a FactsStoryContext provider');
  }
  return context;
};
