//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type CallManager } from '../state';

export type CallsGlobalContextType = {
  call: CallManager;
};

/**
 * @internal
 */
export const CallsGlobalContext = createContext<CallsGlobalContextType | undefined>(undefined);

export const useCallGlobalContext = () => {
  return useContext(CallsGlobalContext) ?? raise(new Error('Missing CallsGlobalContext'));
};
