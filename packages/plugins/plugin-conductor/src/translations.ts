//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { CONDUCTOR_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(CanvasBoardType)]: {
        'typename label': 'Circuit',
        'typename label_zero': 'Circuits',
        'typename label_one': 'Circuit',
        'typename label_other': 'Circuits',
        'object name placeholder': 'New circuit',
      },
      [CONDUCTOR_PLUGIN]: {
        'plugin name': 'Conductor',
        'content placeholder': 'Enter text...',
      },
    },
  },
] as const;

export default translations;
