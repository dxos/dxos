//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = 'react-ui-board';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'button center': 'Center board',
        'button zoom': 'Toggle zoom',
        'button add': 'Add object',
        'button delete': 'Remove object',
      },
    },
  },
] as const satisfies Resource[];
