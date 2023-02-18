//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { useClient } from '../client';
import { useInvitationStatus } from '../invitations';

export const useHaloInvitations = () => {
  const client = useClient();
  const invitations =
    useSyncExternalStore(
      (listener) => client.halo.invitationsUpdate.on(() => listener()),
      () => client.halo.invitations
    ) ?? [];

  return invitations;
};

export const useHaloInvitation = (invitationId?: string) => {
  const invitations = useHaloInvitations();
  const invitation = useMemo(
    () => invitations.find(({ invitation }) => invitation?.invitationId === invitationId),
    [invitations]
  );
  return useInvitationStatus(invitation);
};
