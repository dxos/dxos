//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.support',
  name: 'Support',
  author: 'DXOS',
  description: trim`
    User assistance for Composer: welcome tour, shortcuts, one-shot feedback, and an AI
    support assistant that can search documentation and capture conversations as
    local-first ECHO tickets.
  `,
  icon: 'ph--lifebuoy--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-support',
  tags: ['system'],
  version: '0.8.3',
  spec: 'https://unpkg.com/@dxos/plugin-support@0.8.3/PLUGIN.mdl',
};
