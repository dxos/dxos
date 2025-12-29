//
// Copyright 2025 DXOS.org
//

import { RootSettingsStore } from '@dxos/local-storage';

import * as Common from '../common';
import { Capability } from '../core';

export default Capability.makeModule((context) => {
  // TODO(wittjosiah): Replace with atom?
  const settingsStore = new RootSettingsStore();

  let previous: Common.Capability.Settings[] = [];
  const registry = context.getCapability(Common.Capability.AtomRegistry);
  const cancel = registry.subscribe(
    context.capabilities(Common.Capability.Settings),
    (allSettings) => {
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

  return Capability.contributes(Common.Capability.SettingsStore, settingsStore, () => cancel());
});
