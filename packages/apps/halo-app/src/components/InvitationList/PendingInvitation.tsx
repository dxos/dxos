//
// Copyright 2022 DXOS.org
//

import React from 'react';
import urlJoin from 'url-join';

import { InvitationRequest } from '@dxos/client';
import { Avatar, Group, QrCode, useTranslation } from '@dxos/react-uikit';

export interface PendingInvitationProps {
  value: InvitationRequest;
}

export const PendingInvitation = ({ value }: PendingInvitationProps) => {
  const { t } = useTranslation('halo');

  return (
    <Group
      label={{
        level: 2,
        className: 'text-lg font-body flex gap-2 items-center',
        children: (
          <Avatar
            size={10}
            fallbackValue={value.descriptor.hash}
            label={<p>Pending...</p>}
          />
        )
      }}
    >
      <p className='w-64'>
        <QrCode
          size={40}
          value={createInvitationUrl(value.descriptor.encode().toString())}
          label={<p className='w-20'>{t('copy device invite code label')}</p>}
          side='left'
          sideOffset={12}
          className='w-full h-auto'
        />
      </p>
    </Group>
  );
};

// TODO(wittjosiah): Factor out.
const createInvitationUrl = (invitationCode: string) => {
  const invitationPath = '/identity/join';
  const { origin, pathname } = window.location;
  return urlJoin(
    origin,
    pathname,
    `/#${invitationPath}`,
    `?invitation=${invitationCode}`
  );
};
