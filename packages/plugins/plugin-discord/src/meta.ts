//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.discord',
  name: 'Discord',
  description: trim`
    Configure and control a Discord bot from Composer.
    Connect Discord guilds to spaces, track conversations, and manage bot identity.
  `,
  icon: 'ph--discord-logo--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-discord',
  tags: ['labs'],
  version: '0.8.3',
  spec: 'https://unpkg.com/@dxos/plugin-discord@0.8.3/PLUGIN.mdl',
};
