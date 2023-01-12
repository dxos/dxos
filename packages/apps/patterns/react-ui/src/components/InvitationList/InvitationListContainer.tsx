//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { PublicKey } from '@dxos/keys';
import { useSpace } from '@dxos/react-client';

import { InvitationList } from './InvitationList';

export interface InvitationListContainerProps {
  spaceKey: PublicKey;
}

export const InvitationListContainer = ({ spaceKey }: InvitationListContainerProps) => {
  const space = useSpace(spaceKey);
  const invitations = space?.invitations ?? [];
  return <InvitationList invitations={invitations} />;
};
