//
// Copyright 2023 DXOS.org
//
import { Root as AccordionRoot } from '@radix-ui/react-accordion';
import React from 'react';

import type { CancellableInvitationObservable } from '@dxos/client';

import { InvitationListItem, InvitationListItemProps } from './InvitationListItem';

export interface InvitationListProps extends Omit<InvitationListItemProps, 'invitation' | 'value'> {
  invitations: CancellableInvitationObservable[];
}

export const InvitationList = ({ invitations, ...invitationProps }: InvitationListProps) => {
  return (
    <AccordionRoot type='single' collapsible>
      {invitations.map((invitation, index) => {
        const value = invitation.invitation?.invitationId ?? `inv_${index}`;
        return <InvitationListItem key={value} value={value} invitation={invitation} {...invitationProps} />;
      })}
    </AccordionRoot>
  );
};
