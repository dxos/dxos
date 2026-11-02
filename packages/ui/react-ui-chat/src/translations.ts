//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translationKey = '@dxos/react-ui-chat';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'commands.label': 'Commands',
      },
    },
  },
] as const satisfies Theme.Resource[];
