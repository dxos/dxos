//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SETTINGS_INTERFACE_PLUGIN = 'dxos.org/plugin/settings-interface';
export const SETTINGS_ID = 'dxos:settings';

export default {
  id: SETTINGS_INTERFACE_PLUGIN,
  name: 'Settings',
} satisfies PluginMeta;
