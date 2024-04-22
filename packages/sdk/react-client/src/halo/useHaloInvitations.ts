//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { useMulticastObservable } from '@dxos/react-async';
import { useClient } from '../client';
import { CancellableInvitationObservable, useInvitationStatus } from '../invitations';

export const useHaloInvitations = (): CancellableInvitationObservable[] => {
  const client = useClient();
  return useMulticastObservable(client.halo.invitations);
};

export const useHaloInvitation = (invitationId?: string) => {
  const invitations = useHaloInvitations();
  const invitation = useMemo(
    () => invitations.find((invitation) => invitation.get().invitationId === invitationId),
    [invitations],
  );
  return useInvitationStatus(invitation);
};
