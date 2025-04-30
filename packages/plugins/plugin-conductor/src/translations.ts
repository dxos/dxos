//
// Copyright 2023 DXOS.org
//

import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { CONDUCTOR_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [CanvasBoardType.typename]: {
        'typename label': 'Circuit',
        'object name placeholder': 'New circuit',
      },
      [CONDUCTOR_PLUGIN]: {
        'plugin name': 'Conductor',
        'content placeholder': 'Enter text...',
      },
    },
  },
];
