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
      (listener) => {
        const subscription = client.halo.invitations.subscribe(() => listener());
        return () => subscription.unsubscribe();
      },
      () => client.halo.invitations.get(),
    ) ?? [];

  return invitations;
};

export const useHaloInvitation = (invitationId?: string) => {
  const invitations = useHaloInvitations();
  const invitation = useMemo(
    () => invitations.find((invitation) => invitation.get().invitationId === invitationId),
    [invitations],
  );
  return useInvitationStatus(invitation);
};
