//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { List, useTranslation } from '@dxos/aurora';
import { descriptionText, mx } from '@dxos/aurora-theme';
import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { ClipboardProvider } from '../Clipboard';
import { InvitationListItem, InvitationListItemProps } from './InvitationListItem';
import { SharedInvitationListProps } from './InvitationListProps';

export interface InvitationListProps
  extends Omit<InvitationListItemProps, 'invitation' | 'value'>,
    Pick<SharedInvitationListProps, 'send'> {
  invitations: CancellableInvitationObservable[];
}

export const InvitationList = ({ invitations, send, ...invitationProps }: InvitationListProps) => {
  const { t } = useTranslation('os');
  return invitations.length ? (
    <ClipboardProvider>
      <List classNames='flex flex-col gap-1'>
        {invitations.map((invitation) => {
          const value = invitation.get().invitationId;
          return <InvitationListItem key={value} send={send} invitation={invitation} {...invitationProps} />;
        })}
      </List>
    </ClipboardProvider>
  ) : (
    <div role='none' className='grow flex items-center p-2'>
      <p className={mx(descriptionText, 'text-center is-full')}>{t('empty invitations message')}</p>
    </div>
  );
};
