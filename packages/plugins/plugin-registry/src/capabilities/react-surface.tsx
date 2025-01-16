//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';

import { PluginSettings } from '../components';
import { meta, REGISTRY_PLUGIN } from '../meta';
import { type RegistrySettings } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: 'settings',
      filter: (data): data is any => data.subject === REGISTRY_PLUGIN,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<RegistrySettings>(REGISTRY_PLUGIN)!.value;
        return <PluginSettings settings={settings} />;
      },
    }),
  ]);
