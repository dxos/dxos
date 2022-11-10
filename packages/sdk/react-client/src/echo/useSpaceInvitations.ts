//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { ObservableInvitation, PartyProxy } from '@dxos/client';
import { PublicKey } from '@dxos/keys';

import { useInvitationStatus } from '../invitations';
import { useSpace } from './useSpaces';

export const useSpaceInvitations = (spaceKey?: PublicKey): ObservableInvitation[] => {
  const space = useSpace(spaceKey);
  const [invitations, setInvitations] = useState<ObservableInvitation[]>(space?.invitations ?? []);

  useEffect(() => {
    if (!(space instanceof PartyProxy)) {
      return;
    }

    return space.invitationsUpdate.on(() => {
      setInvitations(space.invitations);
    });
  }, [space]);

  return invitations;
};

export const useSpaceInvitation = (spaceKey?: PublicKey, invitationId?: string) => {
  const invitations = useSpaceInvitations(spaceKey);
  const invitation = useMemo(
    () => invitations.find(({ invitation }) => invitation?.invitationId === invitationId),
    [invitations]
  );
  return useInvitationStatus(invitation);
};
