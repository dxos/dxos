//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { usePlugin } from '@dxos/react-surface';

import { SPACE_PLUGIN, type SpacePluginProvides } from '../types';

export const SpaceSettings = () => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const debugPlugin = usePlugin<SpacePluginProvides>(SPACE_PLUGIN);
  if (!debugPlugin) {
    return null;
  }

  const settings = debugPlugin.provides.settings;

  return (
    <>
      <div role='none' className='flex items-center gap-2'>
        <Input.Root>
          <Input.Checkbox
            checked={settings.showHidden}
            onCheckedChange={(checked) => (settings.showHidden = !!checked)}
          />
          <Input.Label>{t('show hidden spaces label')}</Input.Label>
        </Input.Root>
      </div>
    </>
  );
};

export default SpaceSettings;
