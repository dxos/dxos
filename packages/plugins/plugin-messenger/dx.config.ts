//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.messenger',
    name: 'Messenger',
    author: 'DXOS',
    description: trim`
      Cross-space notifications: space invitations and notices from contacts and bots, relayed
      through the HALO inbox as signed messages. Each message is stored once in a feed in the
      user's default space and listed in a deck companion panel with an unread badge.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-messenger',
    icon: { key: 'ph--envelope--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
});
