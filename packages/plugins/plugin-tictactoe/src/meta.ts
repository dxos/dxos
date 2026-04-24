//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.tictactoe',
  name: 'Tic-Tac-Toe',
  description: trim`
    Configurable Tic-Tac-Toe game supporting multiplayer matches and AI opponents
    with adjustable board sizes and win conditions.
  `,
  icon: 'ph--grid-four--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tictactoe',
};
