//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { REGISTRY_PLUGIN } from '../meta';
import { type RegistrySettings, RegistrySettingsSchema } from '../types';

export default () => {
  const settings = create<RegistrySettings>({});

  return contributes(Capabilities.Settings, {
    schema: RegistrySettingsSchema,
    prefix: REGISTRY_PLUGIN,
    value: settings,
  });
};
