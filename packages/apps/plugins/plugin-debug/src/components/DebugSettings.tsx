//
// Copyright 2023 DXOS.org
//

import React, { useContext } from 'react';

import { SettingsContext } from '@braneframe/plugin-settings';
import { Input, useTranslation } from '@dxos/aurora';

import { SETTINGS_KEY } from '../DebugPlugin';
import { DEBUG_PLUGIN } from '../props';

export const DebugSettings = () => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  // const settings = useSettings();
  const { store } = useContext(SettingsContext);
  const settings = store!.values;
  console.log(':::::::::', settings);

  return (
    <Input.Root>
      {/* TODO(burdon): Should not require custom CSS. */}
      <div className='flex gap-2'>
        <Input.Checkbox
          checked={!!store!.getKey(SETTINGS_KEY)}
          onCheckedChange={() => (settings[SETTINGS_KEY] = 'xxx')}
          // onCheckedChange={(checked) => store!.setKey(SETTINGS_KEY, checked ? 'true' : undefined)}
        />
        <Input.Label>{t('show debug panel')}</Input.Label>
      </div>
    </Input.Root>
  );
};
