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
      },
      [CONDUCTOR_PLUGIN]: {
        'plugin name': 'Conductor',
        'canvas title placeholder': 'New circuit',
        'create canvas label': 'Create circuit',
        'content placeholder': 'Enter text...',
      },
    },
  },
];
