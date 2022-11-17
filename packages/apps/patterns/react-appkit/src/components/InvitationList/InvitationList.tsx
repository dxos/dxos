//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';

import { InvitationObservable } from '@dxos/client';
import { defaultDisabled, Group } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-uikit';

import { PendingInvitation, PendingInvitationProps } from './PendingInvitation';

export interface InvitationListProps {
  createInvitationUrl: PendingInvitationProps['createInvitationUrl'];
  invitations?: InvitationObservable[];
}

export const InvitationList = ({ createInvitationUrl, invitations }: InvitationListProps) => {
  const { t } = useTranslation('appkit');
  const empty = !invitations || invitations.length < 1;
  return (
    <Group
      className='mlb-4'
      label={{
        level: 2,
        children: !empty ? t('invitations label') : t('empty invitations message'),
        className: cx('text-xl', empty && defaultDisabled)
      }}
      elevation={0}
    >
      {!empty &&
        invitations.map((wrapper, index) => (
          <PendingInvitation
            key={wrapper.invitation?.invitationId ?? index}
            wrapper={wrapper}
            createInvitationUrl={createInvitationUrl}
          />
        ))}
    </Group>
  );
};
