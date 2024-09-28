//
// Copyright 2024 DXOS.org
//

import React, { createContext, type PropsWithChildren } from 'react';

import { type ComputeGraphRegistry } from '../../graph';

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
