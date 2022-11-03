//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useClient, useHaloInvitations } from '@dxos/react-client';
import { Button, useTranslation, getSize } from '@dxos/react-uikit';

import { DeviceList, InvitationList, HeadingWithActions } from '../../components';

export const DevicesPage = () => {
  const { t } = useTranslation('halo');
  const client = useClient();
  const [devices] = useState([{ publicKey: PublicKey.random(), displayName: 'This Device' }]);
  const invitations = useHaloInvitations(client);

  const handleInvite = () => {
    void client.halo.createInvitation();
  };

  return (
    <main className='max-is-5xl mli-auto pli-7'>
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
      <InvitationList {...{ invitations }} />
    </main>
  );
};
