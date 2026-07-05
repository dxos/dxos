//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.chessCom',
    name: 'Chess.com',
    author: 'DXOS',
    description: trim`
      Link a Chess.com account, sync archived games into Composer, and browse them
      as interactive chess game cards.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess-com',
    icon: { key: 'ph--chess-knight--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    tags: ['game', 'integration'],
    dependsOn: ['org.dxos.plugin.chess', 'org.dxos.plugin.game'],
  },
});
