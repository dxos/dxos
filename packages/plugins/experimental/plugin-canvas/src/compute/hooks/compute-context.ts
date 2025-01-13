//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import type { StateMachine } from '../graph';

export type ComputeContextType = {
  stateMachine: StateMachine;
};

export const ComputeContext = createContext<ComputeContextType | null>(null);

export const useComputeContext = () => {
  return useContext(ComputeContext) ?? raise(new Error('Missing ComputeContext'));
};
