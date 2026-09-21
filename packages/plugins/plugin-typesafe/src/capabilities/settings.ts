//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { TypeSafeCapabilities, TypeSafeSettings } from '#types';

export const SettingsModule = AppCapability.settings(
  () =>
    Effect.sync(() => {
      const settingsAtom = createKvsStore({
        key: meta.profile.key,
        schema: TypeSafeSettings.Settings,
        defaultValue: TypeSafeSettings.defaults,
      });

      return [
        Capability.contribute(TypeSafeCapabilities.Settings, settingsAtom),
        Capability.contribute(AppCapabilities.Settings, {
          prefix: meta.profile.key,
          schema: TypeSafeSettings.Settings,
          atom: settingsAtom,
        }),
      ];
    }),
  {
    provides: [TypeSafeCapabilities.Settings],
  },
);
