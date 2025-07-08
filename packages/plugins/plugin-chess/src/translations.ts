//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { CHESS_PLUGIN } from './meta';
import { ChessType } from './types';

export const translations = [
  {
    'en-US': {
      [ChessType.typename]: {
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
] as const satisfies Resource[];

export default translations;
