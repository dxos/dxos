//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';
export const THREAD_ITEM = `${THREAD_PLUGIN}/item`;

// TODO(wittjosiah): Needs screenshots.
export const meta: PluginMeta = {
  id: THREAD_PLUGIN,
  name: 'Chat',
  description: 'Chat via text, voice, and video in channels or create comment threads on objects.',
  icon: 'ph--video-conference--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-thread',
};
