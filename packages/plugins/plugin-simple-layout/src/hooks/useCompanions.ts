//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useConnections } from '@dxos/plugin-graph';
import { byPosition } from '@dxos/util';

import { PLANK_COMPANION_TYPE } from './actions';

/**
 * @deprecated Adopt the pattern from useNavbarActions (deriving from graph atoms)
 *   or merge the Drawer companion display into the NavBar component.
 */
export const useCompanions = (nodeId?: string) => {
  const { graph } = useAppGraph();
  const nodes = useConnections(graph, nodeId);
  const companions = nodes.filter((node) => node.type === PLANK_COMPANION_TYPE);
  return useMemo(() => companions.toSorted((a, b) => byPosition(a.properties, b.properties)), [companions]);
};
