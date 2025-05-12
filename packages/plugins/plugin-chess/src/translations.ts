//
// Copyright 2023 DXOS.org
//

import { CHESS_PLUGIN } from './meta';
import { ChessType } from './types';

export default [
  {
    'en-US': {
      [ChessType.typename]: {
        'typename label': 'Game',
        'object name placeholder': 'New game',
      },
      [CHESS_PLUGIN]: {
        'plugin name': 'Chess',
        'delete game label': 'Delete',
      },
    },
  },
];
