//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/client';
import { useMulticastObservable } from '@dxos/react-async';

import { useSpace } from './useSpaces';
import { type CancellableInvitationObservable, useInvitationStatus } from '../invitations';

export const useSpaceInvitations = (spaceKey?: PublicKey): CancellableInvitationObservable[] => {
  const space = useSpace(spaceKey);
  return useMulticastObservable(space?.invitations ?? MulticastObservable.empty()) ?? [];
};

export const useSpaceInvitation = (spaceKey?: PublicKey, invitationId?: string) => {
  const invitations = useSpaceInvitations(spaceKey);
  const invitation = useMemo(
    () => invitations.find((invitation) => invitation.get().invitationId === invitationId),
    [invitations],
  );
  return useInvitationStatus(invitation);
};
