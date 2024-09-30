//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren } from 'react';

import { type ComputeGraph } from './graph';

export type ComputeGraphContextType = {
  graphs: Record<string, ComputeGraph>;
  setGraph: (key: string, graph: ComputeGraph) => void;
};

export const ComputeGraphContext = createContext<ComputeGraphContextType>({ graphs: {}, setGraph: () => {} });

export const ComputeGraphContextProvider = ({
  children,
  graphs,
  setGraph,
}: PropsWithChildren<ComputeGraphContextType>) => {
  return <ComputeGraphContext.Provider value={{ graphs, setGraph }}>{children}</ComputeGraphContext.Provider>;
};
