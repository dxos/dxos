//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { HaloSharingDialog } from '@dxos/react-toolkit';
import { Main, Button, useTranslation } from '@dxos/react-uikit';

import { DeviceList } from '../../components';

export const DevicesPage = () => {
  const [devices] = useState([{ publicKey: PublicKey.random(), displayName: 'This Device' }]);
  const [showShare, setShowShare] = useState(false);
  const { t } = useTranslation('halo');

  return (
    <Main>
      <DeviceList items={devices} />

      <Button variant='primary' className='w-full flex gap-2'>
        <Plus className='w-4 h-4' />
        {t('add device label')}
      </Button>

      <HaloSharingDialog
        open={showShare}
        onClose={() => setShowShare(false)}
      />
    </Main>
  );
};
