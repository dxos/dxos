//
// Copyright 2025 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';

import { CALLS_PLUGIN } from '../meta';

export type CallsGlobalContextType = {
  spaceKey?: PublicKey;
  setSpace: (spaceKey: PublicKey) => void;
};

/**
 * @internal
 */
export const CallsGlobalContext = createContext<CallsGlobalContextType | undefined>(undefined);

export const useCallGlobalContext = () => {
  return useContext(CallsGlobalContext) ?? raise(new Error('Missing CallsGlobalContext'));
};
