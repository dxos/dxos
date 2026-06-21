//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Chess } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Chess.State)]: {
        'typename.label': 'Chess',
        'typename.label_zero': 'Chess games',
        'typename.label_one': 'Chess game',
        'typename.label_other': 'Chess games',
        'object-name.placeholder': 'New chess game',
        'add-object.label': 'Add chess game',
        'rename-object.label': 'Rename chess game',
        'delete-object.label': 'Delete chess game',
      },
      [meta.profile.key]: {
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
