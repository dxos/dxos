//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/react-client/echo';

import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps, DebugSettingsSchema } from '../types';

export default () => {
  const settings = live<DebugSettingsProps>({});

  return contributes(Capabilities.Settings, { schema: DebugSettingsSchema, prefix: DEBUG_PLUGIN, value: settings });
};
