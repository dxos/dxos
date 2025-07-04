//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';

import { EXPLORER_PLUGIN } from './meta';
import { ViewType } from './types';

export default [
  {
    'en-US': {
      [Type.getTypename(ViewType)]: {
        'typename label': 'Explorer',
        'typename label_zero': 'Explorers',
        'typename label_one': 'Explorer',
        'typename label_other': 'Explorers',
        'object name placeholder': 'New explorer',
      },
      [EXPLORER_PLUGIN]: {
        'plugin name': 'Explorer',
        'object title label': 'Title',
      },
    },
  },
];
