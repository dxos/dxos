//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { Kanban } from '@dxos/react-ui-kanban/types';

import { meta } from './meta';

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
        'delete column label': 'Delete column',
        'card field deleted label': 'Card field deleted',
        'card deleted label': 'Card deleted',
      },
    },
  },
] as const satisfies Resource[];
