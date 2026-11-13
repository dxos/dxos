//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { RDF } from '@dxos/pipeline-rdf';
import * as BrainCapabilities from '@dxos/plugin-brain/BrainCapabilities';

import { KnowledgePanel } from '../components/index.ts';
import { useFactsStory } from './context.ts';

/**
 * The store's predicate pool as an ontology. Minted entries name the brain's namespace; a pool whose entries clash
 * (a predicate minted before the seed named it) falls back to the seed vocabulary extended by what does not clash.
 */
const toOntology = (entries: readonly RDF.Ontology.Entry[]): RDF.Ontology.Ontology => {
  const namespace = entries.find((entry) => entry.created !== undefined)?.definedBy ?? RDF.Vocab.LOCAL_BRAIN;
  try {
    return RDF.Ontology.make(entries, { namespace });
  } catch (error) {
    log.warn('predicate pool does not form an ontology; extending the seed', { error });
    return RDF.Ontology.DEFAULT.withNamespace(namespace).include(entries);
  }
};

/**
 * RIGHT: what the facts are about — the entities they relate, or the store's predicates. Choosing an entity or a
 * predicate scopes the facts view (shared selection).
 */
export const EntitiesModule = () => {
  const space = ToolkitHooks.useActiveSpace();
  const registry = Hooks.useCapability(BrainCapabilities.FactStoreRegistry);
  const { facts, selected, setSelected, predicate, setPredicate } = useFactsStory();
  const [ontology, setOntology] = useState<RDF.Ontology.Ontology | undefined>(undefined);

  // The pool grows as facts are written (an extractor mints predicates), so it is re-read whenever the facts change.
  useEffect(() => {
    if (!space) {
      return;
    }
    let cancelled = false;
    void EffectEx.runPromise(registry.forSpace(space.id).predicates()).then(
      (entries) => !cancelled && setOntology(toOntology(entries)),
      (error: unknown) => log.catch(error),
    );
    return () => {
      cancelled = true;
    };
  }, [registry, space, facts]);

  const handlePredicateChange = useCallback(
    (iri: string | undefined) =>
      setPredicate(iri === undefined || !ontology ? undefined : { iri, iris: ontology.equivalents(iri) }),
    [ontology, setPredicate],
  );

  return (
    <KnowledgePanel
      facts={facts}
      ontology={ontology}
      selected={selected}
      onSelect={setSelected}
      predicate={predicate?.iri}
      onPredicateChange={handlePredicateChange}
    />
  );
};
