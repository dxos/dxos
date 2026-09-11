//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { EntityList, entitiesFromFacts } from '../components/index.ts';
import { useFactsStory } from './context.ts';

/** RIGHT: the entities mentioned in the facts; selecting one scopes the viewer (shared selection). */
export const EntitiesModule = () => {
  const { facts, selected, setSelected } = useFactsStory();
  const entities = useMemo(() => entitiesFromFacts(facts), [facts]);
  return <EntityList entities={entities} selected={selected} onSelect={setSelected} />;
};
