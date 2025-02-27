//
// Copyright 2023 DXOS.org
//

import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { CANVAS_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [CanvasBoardType.typename]: {
        'typename label': 'Canvas',
      },
      [CANVAS_PLUGIN]: {
        'plugin name': 'Canvas',
        'canvas title placeholder': 'New canvas',
        'create canvas label': 'Create canvas',
        'content placeholder': 'Enter text...',
      },
    },
  },
];
