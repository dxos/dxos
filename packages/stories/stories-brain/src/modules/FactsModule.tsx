//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type RDF } from '@dxos/pipeline-rdf';
import { FactViewer, storeFactSource } from '@dxos/react-ui-rdf';

import { factInScope, matchesPredicate, useFactsStory } from './context.ts';

/** Statement graphs a chosen entity's facts load from a large store: its newest, which a reader can scroll. */
const SELECTED_GRAPHS = 500;

/**
 * CENTER: the fact graph, scoped by the last SPARQL result, the selected entity and predicate. Reads the shared display
 * state; unscoped over a large store, it pages subjects in as they scroll and loads only the chosen entity's facts.
 */
export const FactsModule = () => {
  const { facts, selected, predicate, scope, store } = useFactsStory();
  const windowed = scope ? undefined : store;
  const predicates = useMemo(() => (predicate ? [...predicate.iris] : undefined), [predicate]);
  const source = useMemo(
    () => (windowed && !selected ? storeFactSource(windowed, predicates ? { predicates } : {}) : undefined),
    [windowed, selected, predicates],
  );

  // A chosen entity's facts are few enough to hold, and the graph view needs them all.
  const [chosen, setChosen] = useState<RDF.Fact[]>([]);
  useEffect(() => {
    setChosen([]);
    if (!windowed || !selected) {
      return;
    }
    let cancelled = false;
    void EffectEx.runPromise(windowed.entityFacts({ keys: [selected], limit: SELECTED_GRAPHS })).then(
      (found) => !cancelled && setChosen(found),
      (error: unknown) => log.catch(error),
    );
    return () => {
      cancelled = true;
    };
  }, [windowed, selected]);

  const held = windowed ? chosen : facts;
  const scoped = useMemo(
    () =>
      held.filter((fact) => (!scope || factInScope(fact, scope)) && (!predicate || matchesPredicate(fact, predicate))),
    [held, predicate, scope],
  );
  return <FactViewer.Root facts={scoped} context={selected} source={source} />;
};
