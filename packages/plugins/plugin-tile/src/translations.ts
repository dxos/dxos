//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Tile } from '#types';

export const translations = [
  {
    'en-US': {
      [Tile.Pattern.typename]: {
        'typename.label': 'Tile Pattern',
        'typename.label_zero': 'Tile Patterns',
        'typename.label_one': 'Tile Pattern',
        'typename.label_other': 'Tile Patterns',
        'object-name.placeholder': 'New pattern',
        'add-object.label': 'Add pattern',
        'rename-object.label': 'Rename pattern',
        'delete-object.label': 'Delete pattern',
        'object-deleted.label': 'Pattern deleted',
      },
      [meta.id]: {
        'plugin.name': 'Tile',
        'square.label': 'Square',
        'triangle.label': 'Triangle',
        'hex.label': 'Hex',
        'single.label': 'Single',
        'repeat.label': 'Repeat',
        'export-svg.label': 'Export SVG',
        'export-png.label': 'Export PNG',
        'preset.label': 'Apply Preset',
      },
    },
  },
] as const satisfies Resource[];
