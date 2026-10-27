//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translationKey = '@dxos/react-ui-mosaic';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'action-menu.label': 'Actions',
        'add-item.label': 'Add item',
        'delete-menu.label': 'Delete',
      },
    },
  },
] as const satisfies Theme.Resource[];
