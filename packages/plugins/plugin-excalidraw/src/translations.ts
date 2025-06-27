//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { DiagramType } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [Type.getTypename(DiagramType)]: {
        'typename label': 'Excalidraw',
        'typename label_zero': 'Excalidraws',
        'typename label_one': 'Excalidraw',
        'typename label_other': 'Excalidraws',
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
