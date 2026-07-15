//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { FactViewer } from '@dxos/react-ui-rdf';
import { type ModuleProps } from '@dxos/story-modules';

import { useFactsStory } from './context';

/** CENTER: the fact graph, scoped by the selected entity. Reads the shared display state. */
export const FactsModule = (_: ModuleProps) => {
  const { facts, selected } = useFactsStory();
  return <FactViewer.Root facts={facts} context={selected} />;
};
