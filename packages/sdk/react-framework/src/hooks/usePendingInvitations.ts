//
// Copyright 2020 DXOS.org
//

import { Dispatch, SetStateAction } from 'react';

import type { PendingInvitation } from '@dxos/client';

import { useFrameworkContext } from './useContext';

export const usePendingInvitations = (): [PendingInvitation[], Dispatch<SetStateAction<PendingInvitation[]>>] => {
  const { invitations } = useFrameworkContext();
  return invitations;
};
