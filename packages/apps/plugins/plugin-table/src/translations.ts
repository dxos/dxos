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
        'close dialog': 'Close',
        'cancel dialog': 'Cancel',
        'create stack section label': 'Create table',
      },
    },
  },
  ...tableTranslations,
];
