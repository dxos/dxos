//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type DebugSettingsProps, DebugSettingsSchema } from '../types';

export default () => {
  const settings = live<DebugSettingsProps>({});

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: DebugSettingsSchema,
    value: settings,
  });
};
