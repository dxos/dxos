//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Table.Table)]: {
        'typename.label': 'Table',
        'typename.label_zero': 'Tables',
        'typename.label_one': 'Table',
        'typename.label_other': 'Tables',
        'object-name.placeholder': 'New table',
        'add-object.label': 'Add table',
        'rename-object.label': 'Rename table',
        'delete-object.label': 'Delete table',
        'object-deleted.label': 'Table deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Tables',
        'table-name.placeholder': 'Table name',
        'table-schema.label': 'Type',
        'companion-schema.label': 'Type',
        'continue.label': 'Continue',
        'add-row.label': 'Add row',
        'save-view.label': 'Save view',
        'delete-row.label': 'Delete row',
        'new-column-button.label': 'Create column',
        'open-object.label': 'Open object',
      },
    },
  },
] as const satisfies Theme.Resource[];
