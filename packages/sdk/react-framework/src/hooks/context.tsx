//
// Copyright 2020 DXOS.org
//

import React, { Dispatch, ReactNode, SetStateAction, createContext, useContext, useState } from 'react';

import { raise } from '@dxos/debug';

export type PendingInvitation = {
  id?: string,
  invitationCode: string
  pin: string | undefined
}

// TODO(burdon): Is this required?
type State<T> = [T, Dispatch<SetStateAction<T>>]

type FrameworkContextState = {
  errors: State<Error | undefined>,
  invitations: State<PendingInvitation[]>
}

/**
 * Set the context using the `useFrameworkContextState` hook.
 */
export const FrameworkContext = createContext<FrameworkContextState | undefined>(undefined);

export const FrameworkContextProvider = ({ children }: { children: ReactNode }) => {
  const errors = useState<Error | undefined>();
  const invitations = useState<PendingInvitation[]>([]);

  const state = {
    errors,
    invitations
  };

  return (
    <FrameworkContext.Provider value={state}>
      {children}
    </FrameworkContext.Provider>
  );
};

export const useFrameworkContext = (): FrameworkContextState => {
  return useContext(FrameworkContext) ?? raise(new Error('FrameworkContext not set.'));
};
