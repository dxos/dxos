//
// Copyright 2024 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import SettingsMeta from './meta';
import { type SettingsPluginProvides } from './provides';
import { type PluginDefinition } from '../plugin-host';

export const SettingsPlugin = (): PluginDefinition<SettingsPluginProvides> => {
  // Global settings singleton.
  // TODO(burdon): Make settings storage extensible so that other plugins can decide the persistence of them.
  const settingsStore = new RootSettingsStore();

  return {
    meta: SettingsMeta,
    provides: {
      settingsStore,
    },
  };
};
