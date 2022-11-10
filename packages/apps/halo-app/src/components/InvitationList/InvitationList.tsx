//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';

import { InvitationObservable } from '@dxos/client';
import { defaultDisabled, Group, useTranslation } from '@dxos/react-uikit';

import { PendingInvitation } from './PendingInvitation';

export interface InvitationListProps {
  invitations?: InvitationObservable[];
}

export const InvitationList = ({ invitations }: InvitationListProps) => {
  const { t } = useTranslation('halo');
  const empty = !invitations || invitations.length < 1;
  return (
    <Group
      className='mbs-4'
      label={{
        level: 2,
        children: !empty ? t('invitations label') : t('empty invitations message'),
        className: cx('text-xl', empty && defaultDisabled)
      }}
      elevation={0}
    >
      {!empty && (
        <div role='none' className='grid grid-cols-[repeat(auto-fill,_minmax(12rem,1fr))] gap-4'>
          {invitations.map((wrapper, index) => (
            <PendingInvitation key={wrapper.invitation?.invitationId ?? index} wrapper={wrapper} />
          ))}
        </div>
      )}
    </Group>
  );
};
