//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { ComputeGraphContext, type ComputeGraphContextType } from './ComputeGraphContext.ts';

export const ComputeGraphContextProvider = ({ registry, children }: PropsWithChildren<ComputeGraphContextType>) => {
  return <ComputeGraphContext.Provider value={{ registry }}>{children}</ComputeGraphContext.Provider>;
};
