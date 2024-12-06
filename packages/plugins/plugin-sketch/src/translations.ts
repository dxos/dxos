//
// Copyright 2023 DXOS.org
//

import { SKETCH_PLUGIN } from './meta';
import { DiagramType} from './types';

export default [
  {
    'en-US': {
      [DiagramType.typename]: {
        'typename label': 'Sketch',
      },
      [SKETCH_PLUGIN]: {
        'plugin name': 'Sketch',
        'object title placeholder': 'New sketch',
        'create object label': 'Create sketch',
        'create stack section label': 'Create sketch',
        'settings hover tools label': 'Auto hide controls',
        'settings grid type label': 'Dotted grid',
      },
    },
  },
];
