//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as PluginManifest from '@dxos/app-framework/PluginManifest';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { meta } from '#meta';
import { RegistryCapabilities, type RegistryPluginOptions, RegistrySettingsSchema } from '#types';

const DEFAULT_DEV_PLUGIN_URL = `http://localhost:${PluginManifest.DEV_SERVER_PORT}/manifest.json`;

export default Capability.makeModule(({ externalPlugins = true }: RegistryPluginOptions = {}) =>
  Effect.sync(() => {
    const settingsAtom = KvsStore.make({
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
);
