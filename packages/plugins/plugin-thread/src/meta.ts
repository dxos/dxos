//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';
export const THREAD_ITEM = `${THREAD_PLUGIN}/item`;

export default {
  id: THREAD_PLUGIN,
  name: 'Threads',
  // TODO(wittjosiah): Update once scope of threads expands.
  description: 'Comment threads on documents.',
  icon: 'ph--chat--regular',
} satisfies PluginMeta;
