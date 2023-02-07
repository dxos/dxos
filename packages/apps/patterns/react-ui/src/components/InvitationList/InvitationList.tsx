//
// Copyright 2023 DXOS.org
//
import { Root as AccordionRoot } from '@radix-ui/react-accordion';
import React from 'react';

import type { CancellableInvitationObservable } from '@dxos/client';
import { defaultDescription, mx, useTranslation } from '@dxos/react-components';

import { InvitationListItem, InvitationListItemProps } from './InvitationListItem';

export interface InvitationListProps extends Omit<InvitationListItemProps, 'invitation' | 'value'> {
  invitations: CancellableInvitationObservable[];
}

export const InvitationList = ({ invitations, ...invitationProps }: InvitationListProps) => {
  const { t } = useTranslation('os');
  return invitations.length ? (
    <AccordionRoot type='single' collapsible className='flex flex-col gap-1'>
      {invitations.map((invitation, index) => {
        const value = invitation.invitation?.invitationId ?? `inv_${index}`;
        return <InvitationListItem key={value} value={value} invitation={invitation} {...invitationProps} />;
      })}
    </AccordionRoot>
  ) : (
    <p className={mx(defaultDescription, 'text-center p-2')}>{t('empty invitations message')}</p>
  );
};
