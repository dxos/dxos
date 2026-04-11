//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/tictactoe',
  name: 'Tic-Tac-Toe',
  description: trim`
    Classic 3×3 Tic-Tac-Toe supporting two-player matches or single-player games against an AI opponent.
  `,
  icon: 'ph--hash--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tictactoe',
};
