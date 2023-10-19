//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useShell } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-ui';

export const OpenVault = () => {
  const { t } = useTranslation('halo');
  const shell = useShell();

  return <Button onClick={() => shell.open()}>{t('open vault label')}</Button>;
};
