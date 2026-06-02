//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { meta as gameMeta } from '@dxos/plugin-game';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.chess'),
  name: 'Chess',
  author: 'DXOS',
  description: trim`
    Full-featured chess game supporting multiplayer matches with friends or practice sessions against AI opponents.
    Track game history and analyze moves in real-time.
  `,
  icon: 'ph--shield-chevron--regular',
  iconHue: 'amber',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess',
  spec: 'PLUGIN.mdl',
  screenshots: ['https://dxos.network/plugin-details-chess-dark.png'],
  dependsOn: [gameMeta.id],
  tags: ['game'],
});
