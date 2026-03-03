//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-table';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'object placeholder': 'New table',
        'create object label': 'Create table',
        'table name placeholder': 'Table name',
        'settings title': 'Table settings',
        'table schema label': 'Type',
        'new schema': 'New type',
        'continue label': 'Continue',
        'create stack section label': 'Create table',
        'add row label': 'Add row',
        'create comment': 'Create thread',
        'column action sort descending': 'Sort Descending',
        'column action sort ascending': 'Sort Ascending',
        'column action clear sorting': 'Clear Sorting',
        'column action settings': 'Column Settings',
        'column action delete': 'Delete Column',
        'delete row label': 'Delete row',
        'bulk delete row label': 'Delete selected rows',
        'column deleted label': 'Column deleted',
        'new column button label': 'Create column',
        'create new object label': 'Create new object “{{text}}”',
        'save view label': 'Save changes to view',
      },
    },
  },
] as const satisfies Resource[];
