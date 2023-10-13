//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { staticDisabled, mx } from '@dxos/aurora-theme';
import { type CancellableInvitationObservable } from '@dxos/react-client/invitations';

import { PendingInvitation, type PendingInvitationProps } from './PendingInvitation';
import { Group } from '../Group';

export interface InvitationListProps {
  createInvitationUrl: PendingInvitationProps['createInvitationUrl'];
  onClickRemove: PendingInvitationProps['onClickRemove'];
  invitations?: CancellableInvitationObservable[];
}

export const InvitationList = ({ createInvitationUrl, invitations, onClickRemove }: InvitationListProps) => {
  const { t } = useTranslation('appkit');
  const empty = !invitations || invitations.length < 1;
  return (
    <Group
      className='mlb-4 p-2 rounded'
      label={{
        level: 2,
        children: !empty ? t('invitations label') : t('empty invitations message'),
        className: mx('text-xl', empty && staticDisabled),
      }}
      elevation='base'
    >
      {!empty &&
        invitations.map((wrapper, index) => (
          <PendingInvitation
            key={wrapper.get().invitationId ?? index}
            wrapper={wrapper}
            createInvitationUrl={createInvitationUrl}
            onClickRemove={onClickRemove}
          />
        ))}
    </Group>
  );
};
