//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue, usePlugins } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { PluginList } from './PluginList';
import { type RegistrySettingsProps } from '../RegistryPlugin';
import { REGISTRY_PLUGIN } from '../meta';

export const PluginSettings = ({ settings }: { settings: RegistrySettingsProps }) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { available, plugins, enabled, setPlugin } = usePlugins();

  const sortedPlugins = available
    .filter((meta) => !meta.tags?.includes('experimental') || !!settings.experimental)
    .sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? 0);

  return (
    <>
      <SettingsValue label={t('settings show experimental')}>
        <Input.Switch
          checked={settings.experimental}
          onCheckedChange={(checked) => (settings.experimental = !!checked)}
        />
      </SettingsValue>

      <h2>Installed</h2>
      <PluginList
        plugins={sortedPlugins}
        loaded={plugins.map(({ meta }) => meta.id)}
        enabled={enabled}
        onChange={(id, enabled) => setPlugin(id, enabled)}
      />
    </>
  );
};
