//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

import specContent from '../PLUGIN.mdl?raw';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.gallery',
  name: 'Gallery',
  description: trim`
    A simple image gallery. Drop in images from your filesystem (uploaded to WNFS) or external URLs;
    browse them in a masonry grid and present in fullscreen.
  `,
  icon: 'ph--images--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-gallery',
  spec: 'https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-gallery/PLUGIN.mdl',
  specContent,
};
