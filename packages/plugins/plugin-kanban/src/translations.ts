//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { KanbanType } from '@dxos/react-ui-kanban';

import { KANBAN_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [KanbanType.typename]: {
        'typename label': 'Kanban',
        'typename label_zero': 'Kanbans',
        'typename label_one': 'Kanban',
        'typename label_other': 'Kanbans',
        'object name placeholder': 'New kanban',
      },
      [KANBAN_PLUGIN]: {
        'plugin name': 'Kanban',
        'kanban title label': 'Title',
        'column title label': 'Column title',
        'column title placeholder': 'New column',
        'item title label': 'Item title',
        'item title placeholder': 'New item',
        'add column label': 'Add column',
        'add item label': 'Add card',
        'delete column label': 'Delete column',
        'delete item label': 'Delete card',
        'card field deleted label': 'Card field deleted',
        'card deleted label': 'Card deleted',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
