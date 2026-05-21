//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.generator',
  name: 'Generator',
  author: 'DXOS',
  description: trim`
    AI video and audio generation. Author a markdown prompt and dispatch
    it to a pluggable provider (default: HeyGen) to produce playable media.
  `,
  icon: 'ph--film-reel--regular',
  iconHue: 'fuchsia',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-generator',
  spec: 'PLUGIN.mdl',
  version: '0.8.3',
  tags: ['labs'],
};
