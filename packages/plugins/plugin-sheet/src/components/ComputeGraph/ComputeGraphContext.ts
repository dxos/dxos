//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type ComputeGraph, type ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { raise } from '@dxos/debug';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

// Kept out of `ComputeGraphContextProvider.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type ComputeGraphContextType = {
  registry: ComputeGraphRegistry;
};

/**
 * The compute graph context manages a ComputeGraph for each space.
 */
export const ComputeGraphContext = createContext<ComputeGraphContextType | undefined>(undefined);

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
