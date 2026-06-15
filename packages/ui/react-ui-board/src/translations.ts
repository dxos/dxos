//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-board';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'move-to-center.button': 'Center board',
        'toggle-zoom.button': 'Toggle zoom',
        'add-object.button': 'Add object',
        'delete-object.button': 'Remove object',
      },
    },
  },
] as const satisfies Resource[];
