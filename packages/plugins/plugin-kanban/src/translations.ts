//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Kanban } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Kanban.Kanban)]: {
        'typename label': 'Kanban',
        'typename label_zero': 'Kanbans',
        'typename label_one': 'Kanban',
        'typename label_other': 'Kanbans',
        'object name placeholder': 'New kanban',
        'rename object label': 'Rename kanban',
        'delete object label': 'Delete kanban',
        'object deleted label': 'Kanban deleted',
      },
      [meta.id]: {
        'plugin name': 'Kanban',
        'kanban title label': 'Title',
        'column title label': 'Column title',
        'column title placeholder': 'New column',
        'add column label': 'Add column',
        'add card label': 'Add card',
        'new column name label': 'New column name',
        'remove card label': 'Remove card',
        'remove empty column label': 'Remove empty column',
        'column drag handle label': 'Drag to rearrange',
        'action menu label': 'Action menu',
        'delete column label': 'Delete column',
        'card field deleted label': 'Card field deleted',
        'card deleted label': 'Card deleted',
        'select pivot placeholder': 'Select a pivot column in board settings to display columns.',
      },
    },
  },
] as const satisfies Resource[];
