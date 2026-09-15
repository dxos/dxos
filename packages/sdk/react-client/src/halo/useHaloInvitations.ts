//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client/index.ts';
import { type CancellableInvitationObservable, useInvitationStatus } from '../invitations/index.ts';

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
