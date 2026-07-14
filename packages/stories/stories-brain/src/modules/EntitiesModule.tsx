//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type ModuleProps } from '@dxos/story-modules';

import { EntityList, entitiesFromFacts } from '../components';
import { useFactsStory } from './context';

/** RIGHT: the entities mentioned in the facts; selecting one scopes the viewer (shared selection). */
export const EntitiesModule = (_: ModuleProps) => {
  const { facts, selected, setSelected } = useFactsStory();
  const entities = useMemo(() => entitiesFromFacts(facts), [facts]);
  return <EntityList entities={entities} selected={selected} onSelect={setSelected} />;
};
