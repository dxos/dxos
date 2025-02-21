//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CHESS_PLUGIN = 'dxos.org/plugin/chess';

export const meta = {
  id: CHESS_PLUGIN,
  name: 'Chess',
  description:
    'Chess is a simple plugin which allows you to render an interactive chessboard inside of a plank. This chessboard can be used for collaborative chess games, or for practice experiments with the LLM. ',
  icon: 'ph--shield-chevron--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-chess',
  screenshots: ['https://dxos.network/plugin-details-chess-dark.png'],
} satisfies PluginMeta;
