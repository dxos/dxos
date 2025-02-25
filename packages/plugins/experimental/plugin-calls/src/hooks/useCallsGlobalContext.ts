//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type PublicKey } from '@dxos/keys';

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
