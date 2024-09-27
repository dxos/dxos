//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';
import { createContext } from 'react';

import { type SpaceId } from '@dxos/keys';

import { type ComputeGraph } from '../../graph';

export type ComputeGraphContextType = {
  graphs: Record<SpaceId, ComputeGraph>;
  setGraph: (key: string, graph: ComputeGraph) => void;
};

/**
 * The compute graph context manages a ComputeGraph for each space.
 */
export const ComputeGraphContext = createContext<ComputeGraphContextType>({ graphs: {}, setGraph: () => {} });

export const ComputeGraphContextProvider = ({
  children,
  graphs,
  setGraph,
}: PropsWithChildren<ComputeGraphContextType>) => {
  return <ComputeGraphContext.Provider value={{ graphs, setGraph }}>{children}</ComputeGraphContext.Provider>;
};
