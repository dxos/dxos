//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Map } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Map.Map)]: {
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
] as const satisfies Resource[];
