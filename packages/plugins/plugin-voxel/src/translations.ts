//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Voxel } from './types';

export const translations = [
  {
    'en-US': {
      [Voxel.World.typename]: {
        'typename.label': 'Voxel World',
        'typename.label_zero': 'Voxel Worlds',
        'typename.label_one': 'Voxel World',
        'typename.label_other': 'Voxel Worlds',
        'object-name.placeholder': 'New voxel world',
        'add-object.label': 'Add voxel world',
        'rename-object.label': 'Rename voxel world',
        'delete-object.label': 'Delete voxel world',
        'object-deleted.label': 'Voxel world deleted',
      },
      [meta.id]: {
        'plugin-name': 'Voxel',
      },
    },
  },
] as const satisfies Resource[];
