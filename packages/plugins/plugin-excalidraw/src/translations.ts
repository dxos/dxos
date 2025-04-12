//
// Copyright 2023 DXOS.org
//

import { DiagramType } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [DiagramType.typename]: {
        'typename label': 'Excalidraw',
        'object name placeholder': 'New excalidraw',
      },
      [EXCALIDRAW_PLUGIN]: {
        'plugin name': 'Sketch',
        'settings hover tools label': 'Auto hide controls',
        'settings grid type label': 'Dotted grid',
      },
    },
  },
];
