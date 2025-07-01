//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';

import { SKETCH_PLUGIN } from './meta';
import { DiagramType } from './types';

export default [
  {
    'en-US': {
      [Type.getTypename(DiagramType)]: {
        'typename label': 'Sketch',
        'typename label_zero': 'Sketches',
        'typename label_one': 'Sketch',
        'typename label_other': 'Sketches',
        'object name placeholder': 'New sketch',
      },
      [SKETCH_PLUGIN]: {
        'plugin name': 'Sketch',
        'settings hover tools label': 'Auto hide controls',
        'settings grid': 'Show grid',
        'settings grid type label': 'Dotted grid',
      },
    },
  },
];
