//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { Terra, TerraObject } from '#types';

import { TerraNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Terra.Terra)]: {
        'typename.label': 'Terra',
        'typename.label_zero': 'Terra Worlds',
        'typename.label_one': 'Terra World',
        'typename.label_other': 'Terra Worlds',
        'object-name.placeholder': 'New Terra world',
        'add-object.label': 'Add Terra world',
        'rename-object.label': 'Rename Terra world',
        'delete-object.label': 'Delete Terra world',
        'object-deleted.label': 'Terra world deleted',
      },
      [Type.getTypename(TerraObject.TerraObject)]: {
        'typename.label': 'Terra Object',
        'typename.label_zero': 'Terra Objects',
        'typename.label_one': 'Terra Object',
        'typename.label_other': 'Terra Objects',
        'object-name.placeholder': 'New Terra object',
        'add-object.label': 'Add Terra object',
        'rename-object.label': 'Rename Terra object',
        'delete-object.label': 'Delete Terra object',
        'object-deleted.label': 'Terra object deleted',
      },
      [TerraNamespace.key]: {
        'plugin.name': 'Terra',
        'play.label': 'Play',
        'pause.label': 'Pause',
        'add-random-object.label': 'Add random object',
        'show-gizmos.label': 'Show rotation gizmos',
        'hide-gizmos.label': 'Hide rotation gizmos',
        'view.label': 'View',
        'scene-view.label': '3D',
        'map-view.label': 'Map',
        'camera-view.label': 'Camera',
      },
    },
  },
] as const satisfies Theme.Resource[];
