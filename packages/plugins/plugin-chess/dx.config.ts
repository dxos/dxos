//
// Copyright 2023 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.chess',
    name: 'Chess',
    description: trim`
      Full-featured chess game supporting multiplayer matches with friends or practice sessions against AI opponents.
      Track game history and analyze moves in real-time.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess',
    icon: { key: 'ph--shield-chevron--regular', hue: 'amber' },
    spec: 'PLUGIN.mdl',
    tags: ['game'],
    screenshots: [{ dark: 'https://dxos.network/plugin-details-chess-dark.png' }],
    dependsOn: ['org.dxos.plugin.game'],
  },
});
