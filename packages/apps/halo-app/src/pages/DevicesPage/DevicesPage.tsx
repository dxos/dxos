//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useClient, useHaloInvitations } from '@dxos/react-client';
import { Main, Button, useTranslation, Heading } from '@dxos/react-uikit';

import { DeviceList, InvitationList } from '../../components';

export const DevicesPage = () => {
  const { t } = useTranslation('halo');
  const client = useClient();
  const [devices] = useState([{ publicKey: PublicKey.random(), displayName: 'This Device' }]);
  const invitations = useHaloInvitations(client);

  const handleInvite = () => {
    void client.halo.createInvitation();
  };

  return (
    <Main className='max-w-7xl mx-auto'>
      <div role='none' className='flex items-center'>
        <Heading>{t('devices label')}</Heading>
        <div role='none' className='flex-grow' />
        <Button variant='primary' className='flex gap-2' onClick={handleInvite}>
          <Plus className='w-4 h-4' />
          {t('add device label')}
        </Button>
      </div>
      <DeviceList items={devices} />
      {invitations.length > 0 && <InvitationList invitations={invitations} />}
    </Main>
  );
};
