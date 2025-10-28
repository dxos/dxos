//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Diagram } from './types';

export const translations = [
  {
    'en-US': {
      [Diagram.Diagram.typename]: {
        'typename label': 'Sketch',
        'typename label_zero': 'Sketches',
        'typename label_one': 'Sketch',
        'typename label_other': 'Sketches',
        'object name placeholder': 'New sketch',
        'rename object label': 'Rename sketch',
        'delete object label': 'Delete sketch',
      },
      [meta.id]: {
        'plugin name': 'Sketch',
        'settings title': 'Sketch plugin settings',
        'settings hover tools label': 'Auto hide controls',
        'settings grid': 'Show grid',
        'settings grid type label': 'Dotted grid',
      },
    },
  },
] as const satisfies Resource[];
