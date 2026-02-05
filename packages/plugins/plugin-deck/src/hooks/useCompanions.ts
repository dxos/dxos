//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-framework/react';
import { useConnections } from '@dxos/plugin-graph';
import { byPosition } from '@dxos/util';

import { PLANK_COMPANION_TYPE } from '../types';

export const useCompanions = (id?: string) => {
  const { graph } = useAppGraph();
  const nodes = useConnections(graph, id);
  const companions = nodes.filter((node) => node.type === PLANK_COMPANION_TYPE);
  return useMemo(() => companions.toSorted((a, b) => byPosition(a.properties, b.properties)), [companions]);
};
