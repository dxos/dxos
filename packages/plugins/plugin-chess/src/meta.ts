//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const CHESS_PLUGIN = 'dxos.org/plugin/chess';

export const meta: PluginMeta = {
  id: CHESS_PLUGIN,
  name: 'Chess',
  description: trim`
    Play chess with friends or practice with the AI.
  `,
  icon: 'ph--shield-chevron--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess',
  screenshots: ['https://dxos.network/plugin-details-chess-dark.png'],
};
