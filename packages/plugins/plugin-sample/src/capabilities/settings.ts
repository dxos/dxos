//
// Copyright 2025 DXOS.org
//

// Settings capability module.
// `createKvsStore` creates a persistent key-value store backed by local storage.
// The settings atom is contributed twice:
// 1. To `SampleCapabilities.Settings` — for internal use within the plugin.
// 2. To `AppCapabilities.Settings` — to register with the global settings panel
//    so users can configure the plugin from the Settings page.

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { SampleCapabilities, Settings } from '#types';

import { SampleNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
      key: SampleNamespace.key,
      schema: Settings.Settings,
      defaultValue: () => ({
        showStatusIndicator: true,
      }),
    });

    return [
      Capability.contribute(SampleCapabilities.Settings, settingsAtom),
      Capability.contribute(AppCapabilities.Settings, {
        prefix: SampleNamespace.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
