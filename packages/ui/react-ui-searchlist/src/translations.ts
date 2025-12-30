//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-searchlist';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'search.placeholder': 'Search...',
      },
    },
  },
] as const satisfies Resource[];
