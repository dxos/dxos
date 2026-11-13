//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { FactViewer } from '@dxos/react-ui-rdf';

import { matchesPredicate, useFactsStory } from './context.ts';

/** CENTER: the fact graph, scoped by the selected entity and predicate. Reads the shared display state. */
export const FactsModule = () => {
  const { facts, selected, predicate } = useFactsStory();
  const scoped = useMemo(
    () => (predicate ? facts.filter((fact) => matchesPredicate(fact, predicate)) : facts),
    [facts, predicate],
  );
  return <FactViewer.Root facts={scoped} context={selected} />;
};
