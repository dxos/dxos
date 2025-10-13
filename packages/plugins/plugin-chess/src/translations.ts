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
      },
      [meta.id]: {
        'plugin name': 'Chess',
        'delete game label': 'Delete',
        'game.checkmate label': 'Checkmate',
        'game.stalemate label': 'Stalemate',
        'game.draw label': 'Draw',
        'game.check label': 'Check',
        'select player button': 'Select player',
        'toggle info button': 'Toggle info',
        'close info button': 'Close info',
        'flip board button': 'Flip board',
      },
    },
  },
] as const satisfies Resource[];
