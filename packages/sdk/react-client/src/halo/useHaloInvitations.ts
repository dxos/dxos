//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client';
import { useInvitationStatus, type CancellableInvitationObservable } from '../invitations';

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
