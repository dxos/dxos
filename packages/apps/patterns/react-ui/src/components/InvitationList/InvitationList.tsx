//
// Copyright 2023 DXOS.org
//
import { Root as AccordionRoot } from '@radix-ui/react-accordion';
import React from 'react';

import type { CancellableInvitationObservable } from '@dxos/client';
import { defaultDescription, DensityProvider, mx, useTranslation } from '@dxos/react-components';

import { ClipboardProvider } from '../Clipboard';
import { InvitationListItem, InvitationListItemProps } from './InvitationListItem';

export interface InvitationListProps extends Omit<InvitationListItemProps, 'invitation' | 'value'> {
  invitations: CancellableInvitationObservable[];
}

export const InvitationList = ({ invitations, ...invitationProps }: InvitationListProps) => {
  const { t } = useTranslation('os');
  return invitations.length ? (
    <AccordionRoot type='single' collapsible className='flex flex-col gap-1'>
      <DensityProvider density='fine'>
        <ClipboardProvider>
          {invitations.map((invitation) => {
            const value = invitation.get().invitationId;
            return <InvitationListItem key={value} value={value} invitation={invitation} {...invitationProps} />;
          })}
        </ClipboardProvider>
      </DensityProvider>
    </AccordionRoot>
  ) : (
    <p className={mx(defaultDescription, 'text-center p-2')}>{t('empty invitations message')}</p>
  );
};
