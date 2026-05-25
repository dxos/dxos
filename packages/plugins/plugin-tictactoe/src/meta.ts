//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { meta as gameMeta } from '@dxos/plugin-game';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.tictactoe',
  name: 'Tic-Tac-Toe',
  author: 'DXOS',
  description: trim`
    Configurable Tic-Tac-Toe game supporting multiplayer matches and AI opponents
    with adjustable board sizes and win conditions.
  `,
  icon: 'ph--hash-straight--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tictactoe',
  spec: 'PLUGIN.mdl',
  dependsOn: [gameMeta.id],
  version: '0.8.3',
  tags: ['labs', 'game'],
};
