//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { TicTacToe } from './types';

export const translations = [
  {
    'en-US': {
      [TicTacToe.Game.typename]: {
        'typename label': 'Tic-Tac-Toe',
        'typename label_zero': 'Tic-Tac-Toe games',
        'typename label_one': 'Tic-Tac-Toe game',
        'typename label_other': 'Tic-Tac-Toe games',
        'object name placeholder': 'New Tic-Tac-Toe game',
        'rename object label': 'Rename game',
        'delete object label': 'Delete game',
        'object deleted label': 'Game deleted',
      },
      [meta.id]: {
        'plugin name': 'Tic-Tac-Toe',
        'game.x-turn label': "X's turn",
        'game.o-turn label': "O's turn",
        'game.x-wins label': 'X wins!',
        'game.o-wins label': 'O wins!',
        'game.draw label': "It's a draw!",
        'player x label': 'Player X',
        'player o label': 'Player O',
        'select player button': 'Select player',
        'toggle info button': 'Toggle info',
        'new game button': 'New Game',
      },
    },
  },
] as const satisfies Resource[];
