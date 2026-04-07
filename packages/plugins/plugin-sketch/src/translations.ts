//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Sketch } from './types';

export const translations = [
  {
    'en-US': {
      [Sketch.Sketch.typename]: {
        'typename.label': 'Sketch',
        'typename.label_zero': 'Sketches',
        'typename.label_one': 'Sketch',
        'typename.label_other': 'Sketches',
        'object-name.placeholder': 'New sketch',
        'add-object.label': 'Add sketch',
        'rename-object.label': 'Rename sketch',
        'delete-object.label': 'Delete sketch',
        'object-deleted.label': 'Sketch deleted',
      },
      [meta.id]: {
        'plugin.name': 'Sketch',
        'settings.title': 'Sketch plugin settings',
        'settings-hover-tools.label': 'Auto hide controls',
        'settings-grid-show.label': 'Show grid',
        'settings-grid-show.description': 'Display a background grid on the sketch canvas.',
        'settings-grid-type.label': 'Dotted grid',
        'settings-grid-type.description': 'Use a dotted grid instead of a mesh grid.',
      },
    },
  },
] as const satisfies Resource[];
