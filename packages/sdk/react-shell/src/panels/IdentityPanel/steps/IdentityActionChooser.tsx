//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight, Check, Plus, Power, UserGear } from '@phosphor-icons/react';
import React, { cloneElement } from 'react';

import { Button, DensityProvider, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { IdentityPanelStepProps } from '../IdentityPanelProps';

export const IdentityActionChooser = ({ send, active, onDone, doneActionParent }: IdentityPanelStepProps) => {
  const { t } = useTranslation('os');
  const doneButton = (
    <Button density='fine' onClick={onDone} disabled={!active} classNames='pli-4' data-testid='identity-panel-done'>
      <CaretLeft weight='bold' className={mx(getSize(4), 'invisible')} />
      <span className='grow'>{t('done label')}</span>
      <Check weight='bold' className={getSize(4)} />
    </Button>
  );
  return (
    <div role='none' className='grow flex flex-col gap-1'>
      <DensityProvider density='coarse'>
        <div className='grow justify-center flex flex-col gap-1'>
          <Button
            disabled={!active}
            data-testid='manage-devices'
            onClick={() => send({ type: 'chooseDevices' })}
            classNames='plb-4'
          >
            <Plus className={getSize(6)} />
            <span className='grow mli-3'>{t('choose devices label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button
            disabled={!active}
            data-testid='manage-profile'
            onClick={() => {} /* send({ type: 'chooseProfile' }) */}
            classNames='plb-4'
          >
            <UserGear className={getSize(6)} />
            <span className='grow mli-3'>{t('choose profile label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
          <Button
            disabled={!active}
            data-testid='sign-out'
            onClick={() => {} /* send({ type: 'chooseSignOut' }) */}
            classNames='plb-4'
          >
            <Power className={getSize(6)} />
            <span className='grow mli-3'>{t('choose sign out label')}</span>
            <CaretRight weight='bold' className={getSize(4)} />
          </Button>
        </div>
      </DensityProvider>
      {doneActionParent ? cloneElement(doneActionParent, {}, doneButton) : doneButton}
    </div>
  );
};
