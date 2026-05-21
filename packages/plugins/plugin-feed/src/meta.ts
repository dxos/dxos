//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.feed',
  name: 'Feed',
  author: 'DXOS',
  description: trim`
    Manage and display RSS and open protocol feed subscriptions.
  `,
  icon: 'ph--rss--regular',
  iconHue: 'orange',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-feed',
  tags: ['labs'],
  version: '0.8.3',
  spec: 'https://unpkg.com/@dxos/plugin-feed@0.8.3/PLUGIN.mdl',
};
