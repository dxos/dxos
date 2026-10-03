//
// Copyright 2023 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

export const translationKey = '@dxos/react-ui-search';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'search.placeholder': 'Search...',
        'empty-results.message': 'No matching objects',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
