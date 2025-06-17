//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { THREAD_PLUGIN } from '../meta';
import { type ThreadSettingsProps, ThreadSettingsSchema } from '../types';

export default () => {
  const settings = live<ThreadSettingsProps>({});
  return contributes(Capabilities.Settings, { schema: ThreadSettingsSchema, prefix: THREAD_PLUGIN, value: settings });
};
