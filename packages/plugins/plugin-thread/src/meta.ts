//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

// TODO(wittjosiah): Needs screenshots.
export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/thread',
  name: 'Chat',
  description: trim`
    Multi-modal communication platform supporting text chat, voice, and video conferencing.
    Create threaded conversations and add contextual comments directly on any workspace object.
  `,
  icon: 'ph--video-conference--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-thread',
};

export const THREAD_ITEM = `${meta.id}/item`;
