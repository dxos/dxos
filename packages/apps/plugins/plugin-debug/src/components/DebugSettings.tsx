//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue, usePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { DEBUG_PLUGIN } from '../meta';
import type { DebugPluginProvides } from '../props';

export const DebugSettings = () => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  const debugPlugin = usePlugin<DebugPluginProvides>(DEBUG_PLUGIN);
  if (!debugPlugin) {
    return null;
  }

  const settings = debugPlugin.provides.settings.values;

  return (
    <>
      <SettingsValue label={t('show debug panel')}>
        <Input.Checkbox checked={settings.debug} onCheckedChange={(checked) => (settings.debug = !!checked)} />
      </SettingsValue>
      <SettingsValue label={t('show devtools panel')}>
        <Input.Checkbox checked={settings.devtools} onCheckedChange={(checked) => (settings.devtools = !!checked)} />
      </SettingsValue>
    </>
  );
};
