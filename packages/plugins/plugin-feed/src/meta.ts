//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.feed',
  name: 'Feed',
  description: trim`
    Manage and display RSS and open protocol feed subscriptions.
  `,
  icon: 'ph--rss--regular',
  iconHue: 'orange',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-feed',
  tags: ['labs'],
};
