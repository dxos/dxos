//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { usePlugins } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { PluginList } from './PluginList';
import { REGISTRY_PLUGIN } from '../meta';

export const Settings = () => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { available, plugins, enabled, enablePlugin, disablePlugin } = usePlugins();

  return (
    <Input.Root>
      <Input.Label>{t('plugin registry label')}</Input.Label>
      <PluginList
        plugins={available}
        loaded={plugins.map(({ meta }) => meta.id)}
        enabled={enabled}
        onChange={(id, enabled) => {
          console.log({ id, enabled });
          enabled ? enablePlugin(id) : disablePlugin(id);
        }}
      />
    </Input.Root>
  );
};
