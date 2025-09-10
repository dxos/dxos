//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = 'react-ui-components';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'scroll-down.button': 'Scroll down',
        'no commits message': 'No events yet',
      },
    },
  },
] as const satisfies Resource[];
