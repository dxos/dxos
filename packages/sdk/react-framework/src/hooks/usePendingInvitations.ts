//
// Copyright 2020 DXOS.org
//

import { Dispatch, SetStateAction, createContext, useContext, useState } from 'react';

import { raise } from '@dxos/debug';

export type PendingInvitation = {
  invitationCode: string
  pin: string | undefined
}

type PendingInvatationsState = [
  pendingInvitations: PendingInvitation[],
  setPendingInvitations: Dispatch<SetStateAction<PendingInvitation[]>>
]

type FrameworkContextState = {
  invitations: PendingInvatationsState
}

/**
 * Set the context using the `useFrameworkContextState` hook.
 *
 * ```
 *   const state = useFrameworkContextState();
 *   return (
 *     <FrameworkContext.Provider value={state}>
 *       ...
 *     </FrameworkContext.Provider>
 *   );
 * ```
 */
export const FrameworkContext = createContext<FrameworkContextState | undefined>(undefined);

/**
 * Creates the context state.
 */
export const useFrameworkContextState = (): FrameworkContextState => {
  const invitations = useState<PendingInvitation[]>([]);
  return {
    invitations
  };
};

// TODO(burdon): Expiration?
export const usePendingInvitations = (): [PendingInvitation[], Dispatch<SetStateAction<PendingInvitation[]>>] => {
  const { invitations } = useContext(FrameworkContext) ?? raise(new Error('FrameworkContext not set.'));
  return invitations;
};
