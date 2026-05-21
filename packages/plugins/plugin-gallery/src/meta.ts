//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.gallery',
  name: 'Gallery',
  author: 'DXOS',
  description: trim`
    A simple image gallery. Drop in images and browse them in a masonry grid;
    present in fullscreen.
  `,
  icon: 'ph--images--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-gallery',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
