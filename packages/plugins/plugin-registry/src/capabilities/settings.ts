//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, PLUGIN_DEV_SERVER_PORT } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { meta } from '#meta';

import { RegistryCapabilities, RegistrySettingsSchema } from '../types';

const DEFAULT_DEV_PLUGIN_URL = `http://localhost:${PLUGIN_DEV_SERVER_PORT}/manifest.json`;

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: RegistrySettingsSchema,
      defaultValue: () => ({ devPluginUrl: DEFAULT_DEV_PLUGIN_URL }),
    });

    return [
      Capability.contributes(RegistryCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: RegistrySettingsSchema,
        atom: settingsAtom,
      }),
    ];
  }),
);
