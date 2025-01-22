//
// Copyright 2023 DXOS.org
//

import { CHESS_PLUGIN } from './meta';
import { GameType } from './types';

export default [
  {
    'en-US': {
      [GameType.typename]: {
        'typename label': 'Game',
      },
      [CHESS_PLUGIN]: {
        'plugin name': 'Chess',
        'game title placeholder': 'New game',
        'create game label': 'Create game',
        'delete game label': 'Delete',
      },
    },
  },
];
