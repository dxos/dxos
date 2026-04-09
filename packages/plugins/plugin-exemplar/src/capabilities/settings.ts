//
// Copyright 2025 DXOS.org
//

// Settings capability module.
// `createKvsStore` creates a persistent key-value store backed by local storage.
// The settings atom is contributed twice:
// 1. To `ExemplarCapabilities.Settings` — for internal use within the plugin.
// 2. To `AppCapabilities.Settings` — to register with the global settings panel
//    so users can configure the plugin from the Settings page.

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { ExemplarCapabilities, Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.id,
      schema: Settings.Settings,
      defaultValue: () => ({
        showStatusIndicator: true,
      }),
    });

    return [
      Capability.contributes(ExemplarCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.id,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
