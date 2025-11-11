//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { Script } from '@dxos/functions';

export const translations = [
  {
    'en-US': {
      [Script.Script.typename]: {
        'typename label': 'Script',
        'typename label_zero': 'Scripts',
        'typename label_one': 'Script',
        'typename label_other': 'Scripts',
      },
    },
  },
] as const satisfies Resource[];
