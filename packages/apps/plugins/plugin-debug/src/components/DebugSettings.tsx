//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/aurora';
import { usePlugin } from '@dxos/react-surface';

import { DEBUG_PLUGIN, DebugPluginProvides } from '../props';

export const DebugSettings = () => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const debugPlugin = usePlugin<DebugPluginProvides>(DEBUG_PLUGIN);
  if (!debugPlugin) {
    return null;
  }

  const settings = debugPlugin.provides.settings;

  // TODO(burdon): Aurora should by default have labels on the right of the checkbox.
  return (
    <>
      <Input.Root>
        <Input.Checkbox checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
        <Input.Label>{t('show debug panel')}</Input.Label>
      </Input.Root>
      <Input.Root>
        <Input.Checkbox checked={settings.devtools} onCheckedChange={(checked) => (settings.devtools = !!checked)} />
        <Input.Label>{t('show devtools panel')}</Input.Label>
      </Input.Root>
    </>
  );
};

export default DebugSettings;