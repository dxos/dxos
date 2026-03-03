//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-calendar';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'today button': 'Today',
      },
    },
  },
] as const satisfies Resource[];
