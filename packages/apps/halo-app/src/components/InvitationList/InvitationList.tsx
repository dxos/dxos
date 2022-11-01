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
    <div role='none' className='grid grid-cols-[repeat(auto-fill,_minmax(12rem,1fr))] gap-4'>
      {invitations.map((invitation) => (
        <PendingInvitation key={invitation.descriptor.hash} value={invitation} />
      ))}
    </div>
  );
};
