//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { FactViewer } from '@dxos/react-ui-rdf';

import { factInScope, matchesPredicate, useFactsStory } from './context.ts';

/** CENTER: the fact graph, scoped by the last SPARQL result, the selected entity and predicate. Reads the shared display state. */
export const FactsModule = () => {
  const { facts, selected, predicate, scope } = useFactsStory();
  const scoped = useMemo(
    () =>
      facts.filter((fact) => (!scope || factInScope(fact, scope)) && (!predicate || matchesPredicate(fact, predicate))),
    [facts, predicate, scope],
  );
  return <FactViewer.Root facts={scoped} context={selected} />;
};
