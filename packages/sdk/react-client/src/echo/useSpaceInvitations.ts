//
// Copyright 2022 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { SpaceProxy } from '@dxos/client';
import { PublicKey } from '@dxos/keys';

import { useInvitationStatus } from '../invitations';
import { useSpace } from './useSpaces';

export const useSpaceInvitations = (spaceKey?: PublicKey) => {
  const { space } = useSpace(spaceKey);
  const invitations =
    useSyncExternalStore(
      (listener) => (space instanceof SpaceProxy ? space.invitationsUpdate.on(() => listener()) : () => {}),
      () => space?.invitations
    ) ?? [];

  return { invitations };
};

export const useSpaceInvitation = (spaceKey?: PublicKey, invitationId?: string) => {
  const { invitations } = useSpaceInvitations(spaceKey);
  const invitation = useMemo(
    () => invitations.find(({ invitation }) => invitation?.invitationId === invitationId),
    [invitations]
  );
  return useInvitationStatus(invitation);
};
