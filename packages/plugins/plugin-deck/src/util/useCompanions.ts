//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-framework';
import { useNode } from '@dxos/plugin-graph';
import { byPosition } from '@dxos/util';

import { COMPANION_TYPE } from '../types';

export const useCompanions = (id?: string) => {
  const { graph } = useAppGraph();
  const node = useNode(graph, id);
  const companions = node ? graph.nodes(node, { type: COMPANION_TYPE }) : [];
  return useMemo(() => companions.toSorted((a, b) => byPosition(a.properties, b.properties)), [companions]);
};
