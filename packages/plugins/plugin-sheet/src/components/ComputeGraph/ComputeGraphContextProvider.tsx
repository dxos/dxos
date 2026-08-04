//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext } from 'react';

import { type ComputeGraph, type ComputeGraphRegistry } from '@dxos/compute-hyperformula';
import { raise } from '@dxos/debug';
import { type Space } from '@dxos/react-client/echo';
import { useAsyncState } from '@dxos/react-hooks';

import { ComputeGraphContext, type ComputeGraphContextType } from './ComputeGraphContext';

export const ComputeGraphContextProvider = ({ registry, children }: PropsWithChildren<ComputeGraphContextType>) => {
  return <ComputeGraphContext.Provider value={{ registry }}>{children}</ComputeGraphContext.Provider>;
};
