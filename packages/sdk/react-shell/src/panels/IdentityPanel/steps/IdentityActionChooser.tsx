//
// Copyright 2023 DXOS.org
//

import { Plus, Power, UserGear } from '@phosphor-icons/react';
import React from 'react';
import { Event, SingleOrArray } from 'xstate';

import { Button, DensityProvider, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { IdentityEvent } from '../identityMachine';

export const IdentityActionChooser = ({ send }: { send: (event: SingleOrArray<Event<IdentityEvent>>) => void }) => {
  const { t } = useTranslation('os');
  return (
    <DensityProvider density='coarse'>
      <Button data-testid='manage-devices' onClick={() => send({ type: 'chooseDevices' })}>
        <Plus className={mx(getSize(6), 'invisible')} />
        <span className='grow'>{t('choose devices label')}</span>
        <Plus className={getSize(6)} />
      </Button>
      <Button data-testid='manage-profile' onClick={() => {} /* send({ type: 'chooseProfile' }) */}>
        <UserGear className={mx(getSize(6), 'invisible')} />
        <span className='grow'>{t('choose profile label')}</span>
        <UserGear className={getSize(6)} />
      </Button>
      <Button data-testid='sign-out' onClick={() => {} /* send({ type: 'chooseSignOut' }) */}>
        <Power className={mx(getSize(6), 'invisible')} />
        <span className='grow'>{t('choose sign out label')}</span>
        <Power className={getSize(6)} />
      </Button>
    </DensityProvider>
  );
};
