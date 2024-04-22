//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { type PublicKey } from '@dxos/client';

import { MulticastObservable } from '@dxos/async';
import { useMulticastObservable } from '@dxos/react-async';
import { CancellableInvitationObservable, useInvitationStatus } from '../invitations';
import { useSpace } from './useSpaces';

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
