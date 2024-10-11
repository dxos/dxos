//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const DEBUG_PLUGIN = 'dxos.org/plugin/debug';

export default {
  id: DEBUG_PLUGIN,
  name: 'Debug',
  description: 'DXOS debugging tools.',
  tags: ['experimental'],
  icon: 'ph--bug--regular',
} satisfies PluginMeta;
