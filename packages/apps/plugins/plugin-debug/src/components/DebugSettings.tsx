//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/aurora';
import { usePlugin } from '@dxos/react-surface';

import { DEBUG_PLUGIN, DebugPluginProvides } from '../props';

// TODO(burdon): Standardize key name (see GH plugin).
export const DebugPanelKey = 'dxos.org/settings/debug';

export const DebugSettings = () => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const debugPlugin = usePlugin<DebugPluginProvides>(DEBUG_PLUGIN);

  if (!debugPlugin) {
    return null;
  }

  const settings = debugPlugin.provides.debug;

  return (
    <Input.Root>
      {/* TODO(burdon): Requires custom CSS. */}
      <Input.Root>
        <div className='flex gap-2'>
          <Input.Checkbox checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
          <Input.Label>{t('show debug panel')}</Input.Label>
        </div>
      </Input.Root>
    </Input.Root>
  );
};
