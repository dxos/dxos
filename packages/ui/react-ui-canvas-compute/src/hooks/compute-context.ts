//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import type { ComputeGraphController } from '../graph';

export type ComputeContextType = {
  controller: ComputeGraphController;
};

export const ComputeContext = createContext<ComputeContextType | null>(null);

export const useComputeContext = () => useContext(ComputeContext) ?? raise(new Error('Missing ComputeContext'));
