//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

import { MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/client';
import { type SpaceId } from '@dxos/client/echo';
import { useMulticastObservable } from '@dxos/react-hooks';

import { type CancellableInvitationObservable, useInvitationStatus } from '../invitations';

import { useSpace } from './useSpaces';

// TODO(wittjosiah): Currently unable to remove `PublicKey` from this api.
//  When initially joining a space that is all that is returned.
export const useSpaceInvitations = (spaceId?: SpaceId | PublicKey): CancellableInvitationObservable[] => {
  const space = useSpace(spaceId);
  return useMulticastObservable(space?.invitations ?? MulticastObservable.empty()) ?? [];
};

// TODO(wittjosiah): Currently unable to remove `PublicKey` from this api.
//  When initially joining a space that is all that is returned.
export const useSpaceInvitation = (spaceId?: SpaceId | PublicKey, invitationId?: string) => {
  const invitations = useSpaceInvitations(spaceId);
  const invitation = useMemo(
    () => invitations.find((invitation) => invitation.get().invitationId === invitationId),
    [invitations],
  );
  return useInvitationStatus(invitation);
};
