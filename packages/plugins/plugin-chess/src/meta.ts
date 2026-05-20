//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { meta as gameMeta } from '@dxos/plugin-game';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.chess',
  name: 'Chess',
  description: trim`
    Full-featured chess game supporting multiplayer matches with friends or practice sessions against AI opponents.
    Track game history and analyze moves in real-time.
  `,
  icon: 'ph--shield-chevron--regular',
  iconHue: 'amber',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess',
  screenshots: ['https://dxos.network/plugin-details-chess-dark.png'],
  dependsOn: [gameMeta.id],
  version: '0.8.3',
  spec: 'https://unpkg.com/@dxos/plugin-chess@0.8.3/PLUGIN.mdl',
};
