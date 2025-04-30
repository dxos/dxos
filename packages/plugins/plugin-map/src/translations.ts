//
// Copyright 2023 DXOS.org
//

import { MAP_PLUGIN } from './meta';
import { MapType } from './types';

export default [
  {
    'en-US': {
      [MapType.typename]: {
        'typename label': 'Map',
        'object name placeholder': 'New map',
      },
      [MAP_PLUGIN]: {
        'plugin name': 'Maps',
        'delete object label': 'Delete',
        'toggle type label': 'Toggle view',
      },
    },
  },
];
