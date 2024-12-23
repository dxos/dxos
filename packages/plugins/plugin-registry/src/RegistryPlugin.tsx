//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  createSurface,
  type PluginDefinition,
  type SettingsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { PluginSettings } from './components';
import meta, { REGISTRY_PLUGIN } from './meta';
import translations from './translations';

export type RegistrySettingsProps = {
  experimental?: boolean;
};

export type RegistryPluginProvides = SurfaceProvides & TranslationsProvides & SettingsProvides<RegistrySettingsProps>;

export const RegistryPlugin = (): PluginDefinition<RegistryPluginProvides> => {
  const settings = new LocalStorageStore<RegistrySettingsProps>(REGISTRY_PLUGIN);

  return {
    meta,
    ready: async () => {
      settings.prop({ key: 'experimental', type: LocalStorageStore.bool({ allowUndefined: true }) });
    },
    provides: {
      settings: settings.values,
      translations,
      surface: {
        definitions: () =>
          createSurface({
            id: meta.id,
            role: 'settings',
            filter: (data): data is any => data.subject === REGISTRY_PLUGIN,
            component: () => <PluginSettings settings={settings.values} />,
          }),
      },
    },
  };
};
