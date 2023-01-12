//
// Copyright 2023 DXOS.org
//
import React, { useCallback } from 'react';

import type { CancellableInvitationObservable } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useSpace, useSpaceInvitations } from '@dxos/react-client';

import { InvitationList } from './InvitationList';
import { SharedInvitationListProps } from './InvitationListProps';

export interface InvitationListContainerProps extends SharedInvitationListProps {
  spaceKey: PublicKey;
}

export const InvitationListContainer = ({ spaceKey, createInvitationUrl }: InvitationListContainerProps) => {
  const space = useSpace(spaceKey);
  const invitations = useSpaceInvitations(spaceKey);
  const onClickRemove = useCallback(
    (invitation: CancellableInvitationObservable) => {
      invitation.invitation?.invitationId && space?.removeInvitation(invitation.invitation.invitationId);
    },
    [space]
  );
  return <InvitationList invitations={invitations} {...{ onClickRemove, createInvitationUrl }} />;
};
