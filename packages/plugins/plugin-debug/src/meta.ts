//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const DEBUG_PLUGIN = 'dxos.org/plugin/debug';

export default {
  id: DEBUG_PLUGIN,
  name: 'Debug',
  description: 'DXOS debugging tools.',
  icon: 'ph--bug--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-debug',
  tags: ['experimental'],
} satisfies PluginMeta;
