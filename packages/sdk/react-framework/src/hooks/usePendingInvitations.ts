//
// Copyright 2020 DXOS.org
//

import { Dispatch, SetStateAction } from 'react';

import { PendingInvitation, useFrameworkContext } from './context';

export const usePendingInvitations = (): [PendingInvitation[], Dispatch<SetStateAction<PendingInvitation[]>>] => {
  const { invitations } = useFrameworkContext();
  return invitations;
};
