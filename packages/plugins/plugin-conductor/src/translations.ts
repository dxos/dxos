//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [CanvasBoardType.typename]: {
        'typename label': 'Circuit',
        'typename label_zero': 'Circuits',
        'typename label_one': 'Circuit',
        'typename label_other': 'Circuits',
        'object name placeholder': 'New circuit',
        'rename object label': 'Rename circuit',
        'delete object label': 'Delete circuit',
        'object deleted label': 'Circuit deleted',
      },
      [meta.id]: {
        'plugin name': 'Conductor',
        'content placeholder': 'Enter text...',
      },
    },
  },
] as const satisfies Resource[];
