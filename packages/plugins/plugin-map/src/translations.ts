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
        'rename object label': 'Rename map',
        'delete object label': 'Delete map',
        'object deleted label': 'Map deleted',
      },
      [meta.id]: {
        'plugin name': 'Maps',
        'toggle type label': 'Toggle view',
      },
    },
  },
] as const satisfies Resource[];
