//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

// TODO(wittjosiah): Needs screenshots.
export const meta: PluginMeta = {
  id: 'dxos.org/plugin/thread',
  name: 'Chat',
  description: 'Chat via text, voice, and video, or comment on objects.',
  icon: 'ph--video-conference--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-thread',
};

export const THREAD_ITEM = `${meta.id}/item`;
