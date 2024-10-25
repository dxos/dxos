//
// Copyright 2023 DXOS.org
//

import { translations as tableTranslations } from '@dxos/react-ui-table';

import { TABLE_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [TABLE_PLUGIN]: {
        'plugin name': 'Tables',
        'object placeholder': 'New table',
        'create object label': 'Create table',
        'table name placeholder': 'Table name',
        'settings title': 'Table settings',
        'table schema label': 'Schema',
        'new schema': 'New schema',
        'continue label': 'Continue',
        'create stack section label': 'Create table',
        'add row': 'Add row',
        'create comment': 'Create thread',
        'column action sort descending': 'Sort Descending',
        'column action sort ascending': 'Sort Ascending',
        'column action clear sorting': 'Clear Sorting',
        'column action settings': 'Column Settings',
        'delete row label': 'Delete row',
      },
    },
  },
  ...tableTranslations,
];
