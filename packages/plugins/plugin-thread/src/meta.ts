//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';
export const THREAD_ITEM = `${THREAD_PLUGIN}/item`;

export default {
  id: THREAD_PLUGIN,
  name: 'Threads',
  description: 'Add comment threads to objects.',
  icon: 'ph--chat--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-thread',
} satisfies PluginMeta;
