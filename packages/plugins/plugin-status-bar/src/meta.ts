//
// Copyright 2024 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const STATUS_BAR_PLUGIN = 'dxos.org/plugin/status-bar';

export default {
  id: STATUS_BAR_PLUGIN,
  name: 'Status Bar',
  description: 'Display a bar with status and actions.',
  icon: 'ph--info--regular',
} satisfies PluginMeta;
