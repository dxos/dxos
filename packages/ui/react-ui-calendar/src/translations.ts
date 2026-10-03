//
// Copyright 2023 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

export const translationKey = '@dxos/react-ui-calendar';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'today.button': 'Today',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
