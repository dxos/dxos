//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translationKey = '@dxos/react-ui-menu';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'toolbar-overflow.menu': 'More',
      },
    },
  },
] as const satisfies Theme.Resource[];
