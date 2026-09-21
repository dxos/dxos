//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { PLUGIN_DEV_SERVER_PORT } from '@dxos/app-framework';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';
import { RegistryCapabilities, type RegistryPluginOptions, RegistrySettingsSchema } from '#types';

const DEFAULT_DEV_PLUGIN_URL = `http://localhost:${PLUGIN_DEV_SERVER_PORT}/manifest.json`;

export const RegistrySettings = AppCapability.settings(
  ({ externalPlugins = true }: RegistryPluginOptions = {}) =>
    Effect.sync(() => {
      const settingsAtom = createKvsStore({
        key: meta.profile.key,
        schema: RegistrySettingsSchema,
        defaultValue: () => ({ devPluginUrl: DEFAULT_DEV_PLUGIN_URL }),
      });

      return [
        Capability.contribute(RegistryCapabilities.Settings, settingsAtom),
        ...(externalPlugins
          ? [
              Capability.contribute(AppCapabilities.Settings, {
                prefix: meta.profile.key,
                schema: RegistrySettingsSchema,
                atom: settingsAtom,
              }),
            ]
          : []),
      ];
    }),
  {
    provides: [RegistryCapabilities.Settings],
  },
);
