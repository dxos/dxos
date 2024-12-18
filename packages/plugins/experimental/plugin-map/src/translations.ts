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
      },
      [MAP_PLUGIN]: {
        'plugin name': 'Maps',
        'object title placeholder': 'New map',
        'create object label': 'Create map',
        'delete object label': 'Delete',
        'create stack section label': 'Create map',
        'toggle type label': 'Toggle view',
      },
    },
  },
];
