//
// Copyright 2023 DXOS.org
//
import { Root as AccordionRoot } from '@radix-ui/react-accordion';
import React from 'react';

import { DensityProvider, useTranslation } from '@dxos/aurora';
import { descriptionText, mx } from '@dxos/aurora-theme';
import type { CancellableInvitationObservable } from '@dxos/client';

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
    <p className={mx(descriptionText, 'text-center p-2')}>{t('empty invitations message')}</p>
  );
};
