//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

import specContent from '../PLUGIN.mdl?raw';

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
  spec: 'https://github.com/dxos/dxos/blob/main/packages/plugins/plugin-discord/PLUGIN.mdl',
  specContent,
};
