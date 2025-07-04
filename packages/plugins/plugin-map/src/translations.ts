//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';

import { MAP_PLUGIN } from './meta';
import { MapType } from './types';

export default [
  {
    'en-US': {
      [Type.getTypename(MapType)]: {
        'typename label': 'Map',
        'typename label_zero': 'Maps',
        'typename label_one': 'Map',
        'typename label_other': 'Maps',
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
