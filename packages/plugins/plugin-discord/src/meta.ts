//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.discord',
  name: 'Discord',
  author: 'DXOS',
  description: trim`
    Connect a Discord bot to your workspace so server channels stream alongside everything else you're doing.
  `,
  icon: 'ph--discord-logo--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-discord',
  tags: ['labs', 'integration'],
};
