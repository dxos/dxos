//
// Copyright 2023 DXOS.org
//

import { DiagramType } from '@dxos/plugin-sketch/types';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [DiagramType.typename]: {
        'typename label': 'Excalidraw',
        'typename label_zero': 'Excalidraws',
        'typename label_one': 'Excalidraw',
        'typename label_other': 'Excalidraws',
        'object name placeholder': 'New excalidraw',
        'rename object label': 'Rename excalidraw',
        'delete object label': 'Delete excalidraw',
      },
      [meta.id]: {
        'plugin name': 'Sketch',
        'settings title': 'Sketch settings',
        'settings hover tools label': 'Auto hide controls',
        'settings grid type label': 'Dotted grid',
      },
    },
  },
] as const satisfies Resource[];
