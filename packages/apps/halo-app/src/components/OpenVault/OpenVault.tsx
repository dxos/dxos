//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { ShellLayout, useShell } from '@dxos/react-client';

export const OpenVault = () => {
  const { t } = useTranslation('halo');
  const shell = useShell();

  return <Button onClick={() => shell.setLayout(ShellLayout.DEVICE_INVITATIONS)}>{t('open vault label')}</Button>;
};
