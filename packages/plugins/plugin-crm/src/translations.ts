//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'CRM',
        'nav-tree-group-crm.label': 'CRM',
        'layout-masonry.label': 'Cards',
        'layout-table.label': 'Table',
        'type-collection-empty.message': 'No items.',
        'object-name.placeholder': 'New object',
        'delete-object.label': 'Delete',
      },
    },
  },
] as const satisfies Resource[];
