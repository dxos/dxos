//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Plus } from 'phosphor-react';
import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useClient, useHaloInvitations } from '@dxos/react-client';
import { Button, useTranslation, getSize, Group, defaultDisabled } from '@dxos/react-uikit';

import { DeviceList, InvitationList } from '../../components';
import { HeadingWithActions } from '../../components/HeadingWithActions';

export const DevicesPage = () => {
  const { t } = useTranslation('halo');
  const client = useClient();
  const [devices] = useState([{ publicKey: PublicKey.random(), displayName: 'This Device' }]);
  const invitations = useHaloInvitations(client);

  const handleInvite = () => {
    void client.halo.createInvitation();
  };

  const empty = invitations.length < 1;

  return (
    <main className='max-is-7xl mli-auto'>
      <HeadingWithActions
        className='mbe-6'
        heading={{ children: t('devices label') }}
        actions={
          <Button variant='primary' className='grow flex gap-1' onClick={handleInvite}>
            <Plus className={getSize(5)} />
            {t('add device label')}
          </Button>
        }
      />
      <DeviceList items={devices} />
      <Group
        className='mbs-4'
        label={{
          level: 2,
          children: !empty ? t('invitations label') : t('empty invitations message'),
          className: cx('text-xl', empty && defaultDisabled)
        }}
        elevation={0}
      >
        {!empty && <InvitationList invitations={invitations} />}
      </Group>
    </main>
  );
};
