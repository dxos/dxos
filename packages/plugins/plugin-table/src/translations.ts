//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { Type } from '@dxos/echo';
import { TableType } from '@dxos/react-ui-table';

import { TABLE_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [Type.getTypename(TableType)]: {
        'typename label': 'Table',
        'typename label_zero': 'Tables',
        'typename label_one': 'Table',
        'typename label_other': 'Tables',
        'object name placeholder': 'New table',
      },
      [TABLE_PLUGIN]: {
        'plugin name': 'Tables',
        'table name placeholder': 'Table name',
        'settings title': 'Table settings',
        'table schema label': 'Schema',
        'companion schema label': 'Schema',
        'new schema': 'New schema',
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
        'column deleted label': 'Column deleted',
        'new column button label': 'Create column',
        'row details no selection label': 'No objects selected',
        'companion selected objects label': 'Selected',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
