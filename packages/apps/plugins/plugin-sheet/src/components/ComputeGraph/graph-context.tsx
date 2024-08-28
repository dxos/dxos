//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext, useEffect } from 'react';

import { type Space } from '@dxos/react-client/echo';

import { createComputeGraph, type ComputeGraph } from './graph';

export type ComputeGraphContextType = {
  graphs: Record<string, ComputeGraph>;
  setGraph: (key: string, graph: ComputeGraph) => void;
};

const ComputeGraphContext = createContext<ComputeGraphContextType>({ graphs: {}, setGraph: () => {} });

export const ComputeGraphContextProvider = ({
  children,
  graphs,
  setGraph,
}: PropsWithChildren<ComputeGraphContextType>) => {
  return <ComputeGraphContext.Provider value={{ graphs, setGraph }}>{children}</ComputeGraphContext.Provider>;
};

export const useComputeGraph = (space: Space): ComputeGraph => {
  const { graphs, setGraph } = useContext(ComputeGraphContext);
  const graph = graphs[space.id] ?? createComputeGraph(space);

  useEffect(() => {
    if (!graphs[space.id]) {
      setGraph(space.id, graph);
    }
  }, [space]);

  return graph;
};
