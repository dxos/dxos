//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Board } from './types';

export const translations = [
  {
    'en-US': {
      [Board.Board.typename]: {
        'typename label': 'Board',
        'typename label_zero': 'Boards',
        'typename label_one': 'Board',
        'typename label_other': 'Boards',
        'object name placeholder': 'New board',
        'rename object label': 'Rename board',
        'delete object label': 'Delete board',
        'object deleted label': 'Board deleted',
      },
      [meta.id]: {
        'plugin name': 'Board',
      },
    },
  },
] as const satisfies Resource[];
