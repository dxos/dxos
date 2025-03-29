//
// Copyright 2023 DXOS.org
//

import { OUTLINER_PLUGIN } from './meta';
import { TreeType } from './types';

export default [
  {
    'en-US': {
      [TreeType.typename]: {
        'typename label': 'Outline',
      },
      [OUTLINER_PLUGIN]: {
        'plugin name': 'Outliner',
        'object placeholder': 'New outline',
        'create object label': 'Create outline',
        'delete object label': 'Delete item',
        'create stack section label': 'Create outline',
        'toggle checkbox label': 'Toggle checkbox',
      },
    },
  },
];
