//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { ProhibitInset } from 'phosphor-react';
import React from 'react';
import urlJoin from 'url-join';

import { InvitationRequest } from '@dxos/client';
import { Avatar, QrCode, useTranslation, Tag, defaultGroup, Button, getSize } from '@dxos/react-uikit';

import { HeadingWithActions } from '../HeadingWithActions';

export interface PendingInvitationProps {
  value: InvitationRequest;
}

export const PendingInvitation = ({ value }: PendingInvitationProps) => {
  const { t } = useTranslation('uikit');

  return (
    <div role='group' className={cx(defaultGroup({ elevation: 1 }))}>
      <HeadingWithActions
        heading={{
          level: 2,
          className: 'text-lg font-body flex gap-2 items-center',
          children: (
            <Avatar
              size={10}
              fallbackValue={value.descriptor.hash}
              label={<Tag valence='warning'>{t('pending label')}</Tag>}
            />
          )
        }}
        actions={
          <>
            <Button className='grow flex gap-1 items-center'>
              <ProhibitInset className={getSize(5)} />
              <span>{t('cancel label')}</span>
            </Button>
          </>
        }
      />
      <QrCode
        size={40}
        value={createInvitationUrl(value.descriptor.encode().toString())}
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
