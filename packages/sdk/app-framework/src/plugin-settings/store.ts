//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { RootSettingsStore } from '@dxos/local-storage';

import * as Common from '../common';
import { Capability } from '../core';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // TODO(wittjosiah): Replace with atom?
    const settingsStore = new RootSettingsStore();

    let previous: Common.Capability.Settings[] = [];
    const registry = yield* Capability.get(Common.Capability.AtomRegistry);
    const settingsAtom = yield* Capability.atom(Common.Capability.Settings);
    const cancel = registry.subscribe(
      settingsAtom,
      (allSettings: Common.Capability.Settings[]) => {
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

    return Capability.contributes(Common.Capability.SettingsStore, settingsStore, () => Effect.sync(() => cancel()));
  }),
);
