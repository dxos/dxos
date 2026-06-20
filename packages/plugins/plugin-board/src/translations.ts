//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Board } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Board.Board)]: {
        'typename.label': 'Board',
        'typename.label_zero': 'Boards',
        'typename.label_one': 'Board',
        'typename.label_other': 'Boards',
        'object-name.placeholder': 'New board',
        'add-object.label': 'Add board',
        'rename-object.label': 'Rename board',
        'delete-object.label': 'Delete board',
        'object-deleted.label': 'Board deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Board',
      },
    },
  },
] as const satisfies Resource[];
