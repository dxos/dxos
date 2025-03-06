//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { RootSettingsStore } from '@dxos/local-storage';

import { Capabilities } from '../common';
import { contributes, type PluginsContext } from '../core';

export default (context: PluginsContext) => {
  const settingsStore = new RootSettingsStore();

  let previous: Capabilities.Settings[] = [];
  const unsubscribe = effect(() => {
    const allSettings = context.requestCapabilities(Capabilities.Settings);
    const added = allSettings.filter((setting) => !previous.includes(setting));
    const removed = previous.filter((setting) => !allSettings.includes(setting));
    previous = allSettings;
    added.forEach((setting) => {
      settingsStore.createStore(setting as any);
    });
    removed.forEach((setting) => {
      settingsStore.removeStore(setting.prefix);
    });
  });

  return contributes(Capabilities.SettingsStore, settingsStore, () => unsubscribe());
};
