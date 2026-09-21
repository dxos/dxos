//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { Debug, Settings } from '#types';

export const DebugSettings = AppCapability.settings(
  () =>
    Effect.sync(() => {
      const settingsAtom = createKvsStore({
        key: meta.profile.key,
        schema: Settings.Settings,
        defaultValue: () => ({}),
      });

      return [
        Capability.contribute(Debug.DebugCapabilities.Settings, settingsAtom),
        Capability.contribute(AppCapabilities.Settings, {
          prefix: meta.profile.key,
          schema: Settings.Settings,
          atom: settingsAtom,
        }),
      ];
    }),
  {
    activatesOn: ActivationEvents.Idle,
    provides: [Debug.DebugCapabilities.Settings],
    environments: ['node'],
  },
);
