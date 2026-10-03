//
// Copyright 2023 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

export const translationKey = '@dxos/react-ui-menu';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'toolbar-overflow.menu': 'More',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
