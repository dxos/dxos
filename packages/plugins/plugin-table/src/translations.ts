//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { Table } from '@dxos/react-ui-table/types';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Table.Table)]: {
        'typename label': 'Table',
        'typename label_zero': 'Tables',
        'typename label_one': 'Table',
        'typename label_other': 'Tables',
        'object name placeholder': 'New table',
        'rename object label': 'Rename table',
        'delete object label': 'Delete table',
        'object deleted label': 'Table deleted',
      },
      [meta.id]: {
        'plugin name': 'Tables',
        'table name placeholder': 'Table name',
        'settings title': 'Table settings',
        'table schema label': 'Type',
        'companion schema label': 'Type',
        'new schema': 'New type',
        'continue label': 'Continue',
        'add row label': 'Add row',
        'save view label': 'Save view',
        'create comment': 'Create thread',
        'column action sort descending': 'Sort Descending',
        'column action sort ascending': 'Sort Ascending',
        'column action clear sorting': 'Clear Sorting',
        'column action settings': 'Column Settings',
        'column action delete': 'Delete Column',
        'delete row label': 'Delete row',
        'new column button label': 'Create column',
        'open object label': 'Open object',
      },
    },
  },
] as const satisfies Resource[];
