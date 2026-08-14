//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.terra',
    name: 'Terra',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-terra',
    spec: 'PLUGIN.mdl',
    description: trim`
      A deterministic 3D planet plugin for DXOS Composer, rendering seed-driven stylized worlds
      with Babylon.js. Each planet is generated procedurally from a seed and its configuration, so
      the same seed and configuration always yield the same land, water, and biome layout, while
      live parameters let users reshape the terrain in real-time.
    `,
    icon: { key: 'ph--globe-hemisphere-west--regular', hue: 'green' },
    tags: ['labs'],
  },
});
