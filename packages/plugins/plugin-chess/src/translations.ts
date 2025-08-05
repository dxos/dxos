//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Chess } from './types';

export const translations = [
  {
    'en-US': {
      [Chess.Game.typename]: {
        'typename label': 'Game',
        'typename label_zero': 'Games',
        'typename label_one': 'Game',
        'typename label_other': 'Games',
        'object name placeholder': 'New game',
        'rename object label': 'Rename game',
        'delete object label': 'Delete game',
        'button toggle info': 'Toggle info',
        'button flip': 'Flip board',
      },
      [meta.id]: {
        'plugin name': 'Chess',
        'delete game label': 'Delete',
        'game.checkmate': 'Checkmate',
        'game.stalemate': 'Stalemate',
        'game.draw': 'Draw',
        'game.check': 'Check',
      },
    },
  },
] as const satisfies Resource[];
