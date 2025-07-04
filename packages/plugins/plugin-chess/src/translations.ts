//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';

import { CHESS_PLUGIN } from './meta';
import { ChessType } from './types';

export default [
  {
    'en-US': {
      [Type.getTypename(ChessType)]: {
        'typename label': 'Game',
        'typename label_zero': 'Games',
        'typename label_one': 'Game',
        'typename label_other': 'Games',
        'object name placeholder': 'New game',
      },
      [CHESS_PLUGIN]: {
        'plugin name': 'Chess',
        'delete game label': 'Delete',
      },
    },
  },
];
