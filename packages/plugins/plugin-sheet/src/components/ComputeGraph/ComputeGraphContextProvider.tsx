//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { type ComputeGraph, type ComputeGraphRegistry } from '../../graph';

export type ComputeGraphContextType = {
  registry: ComputeGraphRegistry;
};

/**
 * The compute graph context manages a ComputeGraph for each space.
 */
export const ComputeGraphContext = createContext<ComputeGraphContextType | undefined>(undefined);

export const ComputeGraphContextProvider = ({ registry, children }: PropsWithChildren<ComputeGraphContextType>) => {
  return <ComputeGraphContext.Provider value={{ registry }}>{children}</ComputeGraphContext.Provider>;
};

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
