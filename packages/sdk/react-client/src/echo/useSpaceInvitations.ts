//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type PublicKey } from '@dxos/client';

import { useSpace } from './useSpaces';
import { useInvitationStatus } from '../invitations';

export const useSpaceInvitations = (spaceKey?: PublicKey) => {
  const space = useSpace(spaceKey);
  const invitations =
    useSyncExternalStore(
      (listener) => {
        if (!space) {
          return () => {};
        }

        const subscription = space.invitations.subscribe(() => listener());
        return () => subscription.unsubscribe();
      },
      () => space?.invitations.get(),
    ) ?? [];

  return invitations;
};

export const useSpaceInvitation = (spaceKey?: PublicKey, invitationId?: string) => {
  const invitations = useSpaceInvitations(spaceKey);
  const invitation = useMemo(
    () => invitations.find((invitation) => invitation.get().invitationId === invitationId),
    [invitations],
  );
  return useInvitationStatus(invitation);
};
