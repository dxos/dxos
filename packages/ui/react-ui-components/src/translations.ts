//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = 'react-ui-components';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'button scroll down': 'Scroll down',
      },
    },
  },
] as const satisfies Resource[];
