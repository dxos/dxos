//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { TicTacToe } from '#types';

export const translations = [
  {
    'en-US': {
      [TicTacToe.Game.typename]: {
        'typename.label': 'Game',
        'typename.label_zero': 'Games',
        'typename.label_one': 'Game',
        'typename.label_other': 'Games',
        'object-name.placeholder': 'New game',
        'add-object.label': 'Add game',
        'rename-object.label': 'Rename game',
        'delete-object.label': 'Delete game',
        'object-deleted.label': 'Game deleted',
      },
      [meta.id]: {
        'plugin.name': 'Tic-Tac-Toe',
        'new-game.button': 'New Game',
        'x-turn.label': "X's turn",
        'o-turn.label': "O's turn",
        'x-wins.label': 'X wins!',
        'o-wins.label': 'O wins!',
        'draw.label': "It's a draw!",
        'ai-thinking.label': 'AI thinking...',
      },
    },
  },
] as const satisfies Resource[];
