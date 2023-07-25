//
// Copyright 2023 DXOS.org
//

import { CaretRight, Plus, Power, UserGear } from '@phosphor-icons/react';
import React from 'react';

import { Button, DensityProvider, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

import { IdentityPanelStepProps } from '../IdentityPanelProps';

export const IdentityActionChooser = ({ send, active }: IdentityPanelStepProps) => {
  const { t } = useTranslation('os');
  return (
    <DensityProvider density='coarse'>
      <div role='none' className='grow flex justify-center items-center'>
        <div role='none' className='flex flex-col gap-1'>
          <Button disabled={!active} data-testid='manage-devices' onClick={() => send({ type: 'chooseDevices' })}>
            <Plus className={getSize(6)} />
            <span className='grow mli-3'>{t('choose devices label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button
            disabled={!active}
            data-testid='manage-profile'
            onClick={() => {} /* send({ type: 'chooseProfile' }) */}
          >
            <UserGear className={getSize(6)} />
            <span className='grow mli-3'>{t('choose profile label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button disabled={!active} data-testid='sign-out' onClick={() => {} /* send({ type: 'chooseSignOut' }) */}>
            <Power className={getSize(6)} />
            <span className='grow mli-3'>{t('choose sign out label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
        </div>
      </div>
    </DensityProvider>
  );
};
