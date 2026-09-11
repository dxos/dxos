//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { FactViewer } from '@dxos/react-ui-rdf';

import { useFactsStory } from './context.ts';

/** CENTER: the fact graph, scoped by the selected entity. Reads the shared display state. */
export const FactsModule = () => {
  const { facts, selected } = useFactsStory();
  return <FactViewer.Root facts={facts} context={selected} />;
};
