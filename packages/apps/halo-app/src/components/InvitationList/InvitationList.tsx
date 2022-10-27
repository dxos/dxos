//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { InvitationRequest } from '@dxos/client';

import { PendingInvitation } from './PendingInvitation';

export interface InvitationListProps {
  invitations: InvitationRequest[];
}

export const InvitationList = ({ invitations }: InvitationListProps) => {
  return (
    <>
      {invitations.map((invitation) => (
        <PendingInvitation
          key={invitation.descriptor.hash}
          value={invitation}
        />
      ))}
    </>
  );
};
