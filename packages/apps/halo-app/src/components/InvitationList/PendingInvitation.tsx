//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { ProhibitInset } from 'phosphor-react';
import React, { useCallback } from 'react';
import urlJoin from 'url-join';

import { Invitation, InvitationEncoder } from '@dxos/client';
import { Avatar, QrCode, useTranslation, Tag, defaultGroup, Button, getSize } from '@dxos/react-uikit';

import { HeadingWithActions } from '../HeadingWithActions';

export interface PendingInvitationProps {
  invitation: Invitation;
}

export const PendingInvitation = ({ invitation }: PendingInvitationProps) => {
  const { t } = useTranslation('uikit');

  const onCancel = useCallback(() => {}, [invitation]);

  return (
    <div role='group' className={cx(defaultGroup({ elevation: 1 }))}>
      <HeadingWithActions
        compact
        heading={{
          level: 2,
          className: 'text-lg font-body flex gap-2 items-center',
          children: (
            <Avatar
              size={10}
              fallbackValue={invitation.invitationId!}
              label={<Tag valence='warning'>{t('pending label')}</Tag>}
            />
          )
        }}
        actions={
          <>
            <Button className='grow flex gap-1 items-center' onClick={onCancel}>
              <ProhibitInset className={getSize(5)} />
              <span>{t('cancel label')}</span>
            </Button>
          </>
        }
      />
      <QrCode
        size={40}
        value={createInvitationUrl(InvitationEncoder.encode(invitation))}
        label={<p className='w-20'>{t('copy halo invite code label')}</p>}
        side='top'
        sideOffset={12}
        className='w-full h-auto mt-2'
      />
    </div>
  );
};

// TODO(wittjosiah): Factor out.
const createInvitationUrl = (invitationCode: string) => {
  const invitationPath = '/identity/join';
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `/#${invitationPath}`, `?invitation=${invitationCode}`);
};
