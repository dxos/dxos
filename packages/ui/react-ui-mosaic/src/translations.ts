//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-mosaic';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'add item label': 'Add item',
        'delete menu label': 'Delete',
      },
    },
  },
] as const satisfies Resource[];
