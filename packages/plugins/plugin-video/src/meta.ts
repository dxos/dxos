//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.video'),
  name: 'Video',
  author: 'DXOS',
  description: trim`
    Store videos and play them inline in DXOS Composer. Each Video object holds a name and a source
    URL that renders in an embedded player. A transcription operation calls a remote EDGE service to
    generate a transcript and links it back to the video as a text object.
  `,
  icon: 'ph--video-camera--regular',
  iconHue: 'red',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-video',
  spec: 'PLUGIN.mdl',
});
