//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { TicTacToe } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(TicTacToe.State)]: {
        'typename.label': 'Tic-Tac-Toe',
        'typename.label_zero': 'Tic-Tac-Toe games',
        'typename.label_one': 'Tic-Tac-Toe game',
        'typename.label_other': 'Tic-Tac-Toe games',
        'add-object.label': 'Add tic-tac-toe game',
        'delete-object.label': 'Delete tic-tac-toe game',
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
