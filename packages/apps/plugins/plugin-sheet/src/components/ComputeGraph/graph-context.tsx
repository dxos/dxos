//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type ComputeGraph } from './graph';

export type ComputeGraphContextType = { graph: ComputeGraph };

const ComputeGraphContext = createContext<ComputeGraphContextType | null>(null);

export const ComputeGraphContextProvider = ({ children, graph }: PropsWithChildren<{ graph: ComputeGraph }>) => {
  return <ComputeGraphContext.Provider value={{ graph }}>{children}</ComputeGraphContext.Provider>;
};

export const useComputeGraph = (): ComputeGraph => {
  const { graph } = useContext(ComputeGraphContext) ?? raise(new Error('Missing GraphContext'));
  return graph;
};
