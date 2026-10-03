//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-geo';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'zoom-in-icon.button': 'Zoom in',
        'zoom-out-icon.button': 'Zoom out',
        'start-icon.button': 'Start',
        'toggle-icon.button': 'Toggle',
        'show-globe.button': 'Show globe',
        'show-map.button': 'Show map',
      },
    },
  },
] as const satisfies Resource[];
