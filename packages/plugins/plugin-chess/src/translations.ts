//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Chess } from '#types';

export const translations = [
  {
    'en-US': {
      [Chess.State.typename]: {
        'typename.label': 'Chess',
        'typename.label_zero': 'Chess games',
        'typename.label_one': 'Chess game',
        'typename.label_other': 'Chess games',
      },
      [meta.id]: {
        'plugin.name': 'Chess',
        'new-game.button': 'New game',
        'delete-game.label': 'Delete',
        'game.checkmate.label': 'Checkmate',
        'game.stalemate.label': 'Stalemate',
        'game.draw.label': 'Draw',
        'game.check.label': 'Check',
        'select-player.button': 'Select player',
        'toggle-info.button': 'Toggle info',
        'close-info.button': 'Close info',
        'flip-board.button': 'Flip board',
      },
    },
  },
] as const satisfies Resource[];
