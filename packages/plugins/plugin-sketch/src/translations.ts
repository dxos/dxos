//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { SKETCH_PLUGIN } from './meta';
import { DiagramType } from './types';

export const translations = [
  {
    'en-US': {
      [DiagramType.typename]: {
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
] as const satisfies Resource[];

export default translations;
