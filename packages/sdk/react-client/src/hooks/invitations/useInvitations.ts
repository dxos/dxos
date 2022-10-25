//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

import { InvitationProxy, InvitationRequest } from '@dxos/client';

export const useInvitations = (
  invitationProxy: InvitationProxy | undefined
) => {
  const [invitations, setInvitations] = useState<InvitationRequest[]>(
    invitationProxy?.activeInvitations ?? []
  );

  useEffect(() => {
    setInvitations(invitationProxy?.activeInvitations ?? []);
    return invitationProxy?.invitationsUpdate.on(() => {
      setInvitations([...invitationProxy.activeInvitations]);
    });
  }, [invitationProxy]);

  return invitations;
};
