//
// Copyright 2024 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { ComputeGraphContext } from '../components';
import { type ComputeGraph } from '../graph';

/**
 * Get existing or create new compute graph for the given space.
 */
export const useComputeGraph = (space?: Space): ComputeGraph | undefined => {
  const { registry } = useContext(ComputeGraphContext) ?? raise(new Error('Missing ComputeGraphContext'));
  const [graph] = useAsyncState(async () => {
    if (space) {
      const graph = registry.getOrCreateGraph(space);
      await graph.open();
      return graph;
    }
  }, [space, registry]);

  return graph;
};
