//
// Copyright 2020 DXOS.org
//

import React, { Dispatch, ReactNode, SetStateAction, createContext, useContext, useState } from 'react';

import type { PendingInvitation } from '@dxos/client';
import { raise } from '@dxos/debug';

// TODO(burdon): Is this required?
type State<T> = [T, Dispatch<SetStateAction<T>>]

type FrameworkContextState = {
  invitations: State<PendingInvitation[]>
}

/**
 * Set the context using the `useFrameworkContextState` hook.
 */
export const FrameworkContext = createContext<FrameworkContextState | undefined>(undefined);

/**
 * @deprecated
 */
export const FrameworkContextProvider = ({ children }: { children: ReactNode }) => {
  const invitations = useState<PendingInvitation[]>([]);

  const state = {
    invitations // TODO(burdon): Move to ClientProvider.
  };

  return (
    <FrameworkContext.Provider value={state}>
      {children}
    </FrameworkContext.Provider>
  );
};

export const useFrameworkContext = (): FrameworkContextState => {
  return useContext(FrameworkContext) ?? raise(new Error('Missing FrameworkContext.'));
};
