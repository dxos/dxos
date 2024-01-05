//
// Copyright 2023 DXOS.org
//
import React, { useCallback } from 'react';

import { type PublicKey } from '@dxos/react-client';
import { useSpace, useSpaceInvitations } from '@dxos/react-client/echo';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { InvitationList } from './InvitationList';
import { type SharedInvitationListProps } from './InvitationListProps';

export interface InvitationListContainerProps extends SharedInvitationListProps {
  spaceKey: PublicKey;
}

export const InvitationListContainer = ({ spaceKey, createInvitationUrl, send }: InvitationListContainerProps) => {
  const space = useSpace(spaceKey);
  const invitations = useSpaceInvitations(spaceKey);
  const onClickRemove = useCallback(
    (invitation: CancellableInvitationObservable) => {
      void invitation.cancel();
    },
    [space],
  );
  return <InvitationList invitations={invitations} {...{ onClickRemove, createInvitationUrl, send }} />;
};
