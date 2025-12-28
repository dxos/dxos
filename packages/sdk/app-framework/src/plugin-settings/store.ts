//
// Copyright 2025 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import { Capabilities } from '../common';
import { Capability } from '../core';

export default Capability.makeModule((context) => {
  console.log('SettingsStore');
  // TODO(wittjosiah): Replace with atom?
  const settingsStore = new RootSettingsStore();

  let previous: Capabilities.Settings[] = [];
  const registry = context.getCapability(Capabilities.AtomRegistry);
  const cancel = registry.subscribe(
    context.capabilities(Capabilities.Settings),
    (allSettings) => {
      console.log('allSettings', allSettings);
      const added = allSettings.filter((setting) => !previous.includes(setting));
      const removed = previous.filter((setting) => !allSettings.includes(setting));
      previous = allSettings;
      added.forEach((setting) => {
        settingsStore.createStore(setting as any);
      });
      removed.forEach((setting) => {
        settingsStore.removeStore(setting.prefix);
      });
    },
    { immediate: true },
  );

  return Capability.contributes(Capabilities.SettingsStore, settingsStore, () => cancel());
});
