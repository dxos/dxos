//
// Copyright 2023 DXOS.org
//

import { Sketch } from '@dxos/plugin-sketch/types';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [Sketch.Sketch.typename]: {
        'typename.label': 'Excalidraw',
        'typename.label_zero': 'Excalidraws',
        'typename.label_one': 'Excalidraw',
        'typename.label_other': 'Excalidraws',
        'object-name.placeholder': 'New excalidraw',
        'add-object.label': 'Add excalidraw',
        'rename-object.label': 'Rename excalidraw',
        'delete-object.label': 'Delete excalidraw',
        'object-deleted.label': 'Excalidraw deleted',
      },
      [meta.id]: {
        'plugin.name': 'Sketch',
        'settings.title': 'Sketch settings',
        'settings.hover-tools.label': 'Auto hide controls',
        'settings.hover-tools.description': 'Hide toolbar controls until you hover over them.',
        'settings.grid-type.label': 'Dotted grid',
        'settings.grid-type.description': 'Use a dotted grid instead of a mesh grid.',
      },
    },
  },
] as const satisfies Resource[];
