//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { ViewType } from './types';

export const translations = [
  {
    'en-US': {
      [ViewType.typename]: {
        'typename label': 'Explorer',
        'typename label_zero': 'Explorers',
        'typename label_one': 'Explorer',
        'typename label_other': 'Explorers',
        'object name placeholder': 'New explorer',
      },
      [meta.id]: {
        'plugin name': 'Explorer',
        'object title label': 'Title',
      },
    },
  },
] as const satisfies Resource[];
