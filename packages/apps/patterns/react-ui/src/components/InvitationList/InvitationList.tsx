//
// Copyright 2023 DXOS.org
//
import { Root as AccordionRoot } from '@radix-ui/react-accordion';
import React from 'react';

import type { CancellableInvitationObservable } from '@dxos/client';

import { InvitationListItem } from './InvitationListItem';

export interface InvitationListProps {
  invitations: CancellableInvitationObservable[];
}

export const InvitationList = ({ invitations }: InvitationListProps) => {
  return (
    <AccordionRoot type='single' collapsible>
      {invitations.map((invitation, index) => {
        const value = invitation.invitation?.invitationId ?? `inv_${index}`;
        return <InvitationListItem key={value} value={value} invitation={invitation} />;
      })}
    </AccordionRoot>
  );
};
