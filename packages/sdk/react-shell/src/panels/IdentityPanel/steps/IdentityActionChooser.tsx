//
// Copyright 2023 DXOS.org
//

import { Devices, UserGear, Power } from '@phosphor-icons/react';
import React from 'react';

import { Button, useTranslation } from '@dxos/aurora';

import { IdentitySend } from '../identityMachine';

export const IdentityActionChooser = ({ send }: { send: IdentitySend }) => {
  const { t } = useTranslation('os');
  return (
    <>
      <Button onClick={() => send({ type: 'chooseDevices' })}>
        <Devices />
        <span>{t('choose devices label')}</span>
      </Button>
      <Button onClick={() => send({ type: 'chooseProfile' })}>
        <UserGear />
        <span>{t('choose profile label')}</span>
      </Button>
      <Button onClick={() => send({ type: 'chooseSignOut' })}>
        <Power />
        <span>{t('choose sign out label')}</span>
      </Button>
    </>
  );
};
