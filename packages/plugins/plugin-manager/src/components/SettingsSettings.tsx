//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { LocalStorageStore } from '@dxos/local-storage';
import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-data';

import { MANAGER_PLUGIN } from '../meta';

export const SettingsSettings = () => {
  const { t } = useTranslation(MANAGER_PLUGIN);

  const handleReset = () => {
    const store = new LocalStorageStore('dxos.org');
    store.reset();
  };

  return (
    <DeprecatedFormInput label={t('reset settings label')}>
      <Button onClick={handleReset}>
        <Icon icon='ph--recycle--regular' />
      </Button>
    </DeprecatedFormInput>
  );
};
