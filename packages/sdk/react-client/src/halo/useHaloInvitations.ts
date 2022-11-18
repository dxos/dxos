//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { InvitationObservable } from '@dxos/client';

import { useClient } from '../client';
import { useInvitationStatus } from '../invitations';

export const useHaloInvitations = (): InvitationObservable[] => {
  const client = useClient();
  const [invitations, setInvitations] = useState<InvitationObservable[]>(client.halo?.invitations ?? []);

  useEffect(() => {
    return client.halo.invitationsUpdate.on(() => {
      setInvitations(client.halo.invitations);
    });
  }, [client.halo]);

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
