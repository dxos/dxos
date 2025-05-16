//
// Copyright 2025 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import { Capabilities } from '../common';
import { contributes, type PluginContext } from '../core';

export default (context: PluginContext) => {
  const settingsStore = new RootSettingsStore();

  let previous: Capabilities.Settings[] = [];
  const registry = context.getCapability(Capabilities.RxRegistry);
  const cancel = registry.subscribe(context.capabilities(Capabilities.Settings), (allSettings) => {
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

  return contributes(Capabilities.SettingsStore, settingsStore, () => cancel());
};
