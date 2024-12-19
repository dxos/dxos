//
// Copyright 2023 DXOS.org
//

import { KanbanType } from '@dxos/react-ui-kanban';

import { KANBAN_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [KanbanType.typename]: {
        'typename label': 'Kanban',
      },
      [KANBAN_PLUGIN]: {
        'plugin name': 'Kanban',
        'kanban title label': 'Title',
        'kanban title placeholder': 'New kanban',
        'column title label': 'Column title',
        'column title placeholder': 'New column',
        'item title label': 'Item title',
        'item title placeholder': 'New item',
        'add column label': 'Add column',
        'add item label': 'Add card',
        'delete column label': 'Delete column',
        'delete item label': 'Delete card',
        'create kanban label': 'Create kanban',
        'card field deleted label': 'Card field deleted',
      },
    },
  },
];
