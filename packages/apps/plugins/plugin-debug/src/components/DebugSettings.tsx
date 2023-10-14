//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/aurora';
import { usePlugin } from '@dxos/react-surface';

import { DEBUG_PLUGIN, type DebugPluginProvides } from '../props';

export const DebugSettings = () => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const debugPlugin = usePlugin<DebugPluginProvides>(DEBUG_PLUGIN);
  if (!debugPlugin) {
    return null;
  }

  const settings = debugPlugin.provides.settings;

  return (
    <div role='none' className='space-y-2'>
      <div role='none' className='flex items-center gap-2'>
        <Input.Root>
          <Input.Checkbox checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
          <Input.Label>{t('show debug panel')}</Input.Label>
        </Input.Root>
      </div>
      <div role='none' className='flex items-center gap-2'>
        <Input.Root>
          <Input.Checkbox checked={settings.devtools} onCheckedChange={(checked) => (settings.devtools = !!checked)} />
          <Input.Label>{t('show devtools panel')}</Input.Label>
        </Input.Root>
      </div>
    </div>
  );
};

export default DebugSettings;
