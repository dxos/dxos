//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { CancellableInvitationObservable } from '@dxos/client';

import { useClient } from '../client';
import { useInvitationStatus } from '../invitations';

export const useHaloInvitations = (): CancellableInvitationObservable[] => {
  const client = useClient();
  const [invitations, setInvitations] = useState<CancellableInvitationObservable[]>(client.halo?.invitations ?? []);

  useEffect(() => {
    return client.halo.invitationsUpdate.on(() => {
      setInvitations([...client.halo.invitations]);
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
