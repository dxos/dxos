//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as geoTrnaslations } from '@dxos/react-ui-geo';

import { meta } from './meta';
import { Map } from './types';

export const translations = [
  {
    'en-US': {
      [Map.Map.typename]: {
        'typename label': 'Map',
        'typename label_zero': 'Maps',
        'typename label_one': 'Map',
        'typename label_other': 'Maps',
        'object name placeholder': 'New map',
      },
      [meta.id]: {
        'plugin name': 'Maps',
        'delete object label': 'Delete',
        'toggle type label': 'Toggle view',
      },
    },
  },
  ...geoTrnaslations,
] as const satisfies Resource[];
