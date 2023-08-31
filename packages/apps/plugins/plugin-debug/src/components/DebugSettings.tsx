//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useSettings } from '@braneframe/plugin-settings';
import { Input, useTranslation } from '@dxos/aurora';

import { SETTINGS_KEY } from '../DebugPlugin';
import { DEBUG_PLUGIN } from '../props';

export const DebugSettings = () => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const settings = useSettings();

  return (
    <Input.Root>
      {/* TODO(burdon): Should not require custom CSS. */}
      <div className='flex gap-2'>
        <Input.Checkbox
          checked={!!settings.getKey(SETTINGS_KEY)}
          onCheckedChange={(checked) => settings.setKey(SETTINGS_KEY, checked ? 'true' : undefined)}
        />
        <Input.Label>{t('show debug panel')}</Input.Label>
      </div>
    </Input.Root>
  );
};
