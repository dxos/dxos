//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-components';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'progress-meter.cancel.label': 'Cancel',
        'progress-meter.dismiss.label': 'Dismiss',
      },
    },
  },
] as const satisfies Resource[];
