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

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { SampleCapabilities, Settings } from '#types';

export const SampleSettings = AppCapability.settings(
  () =>
    Effect.sync(() => {
      const settingsAtom = createKvsStore({
        key: meta.profile.key,
        schema: Settings.Settings,
        defaultValue: () => ({
          showStatusIndicator: true,
        }),
      });

      return [
        Capability.contribute(SampleCapabilities.Settings, settingsAtom),
        Capability.contribute(AppCapabilities.Settings, {
          prefix: meta.profile.key,
          schema: Settings.Settings,
          atom: settingsAtom,
        }),
      ];
    }),
  {
    activatesOn: ActivationEvents.Idle,
    provides: [SampleCapabilities.Settings],
  },
);
