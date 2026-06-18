//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.video',
    name: 'Video',
    description: trim`
      Store videos and play them inline in DXOS Composer. Each Video object holds a name and a source
      URL that renders in an embedded player. A transcription operation calls a remote EDGE service to
      generate a transcript and links it back to the video as a text object.
    `,
    icon: { key: 'ph--video-camera--regular', hue: 'red' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-video',
    spec: 'PLUGIN.mdl',
  },
});
