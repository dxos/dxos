//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { PluginDefinition, SettingsProvides, SurfaceProvides, TranslationsProvides } from '@dxos/app-framework';
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
        component: ({ data, role }) => {
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <PluginSettings settings={settings.values} /> : null;
          }

          return null;
        },
      },
    },
  };
};
