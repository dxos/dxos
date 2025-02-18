//
// Copyright 2025 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import { Capabilities } from '../common';
import { contributes, type PluginsContext } from '../core';

export default (context: PluginsContext) => {
  // TODO(wittjosiah): This should subscribe to capabilities and create stores for newly added settings objects.
  const allSettings = context.requestCapabilities(Capabilities.Settings);
  const settingsStore = new RootSettingsStore();

  allSettings.forEach((setting) => {
    settingsStore.createStore(setting as any);
  });

  return contributes(Capabilities.SettingsStore, settingsStore);
};
