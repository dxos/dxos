//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/chess',
  name: 'Chess',
  description: trim`
    Full-featured chess game supporting multiplayer matches with friends or practice sessions against AI opponents.
    Track game history and analyze moves in real-time.
  `,
  icon: 'ph--shield-chevron--regular',
  iconHue: 'amber',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess',
  screenshots: ['https://dxos.network/plugin-details-chess-dark.png'],
};
