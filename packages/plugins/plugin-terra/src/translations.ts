//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Terra } from '#types';

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
      [meta.profile.key]: {
        'plugin.name': 'Terra',
        'play.label': 'Play',
        'pause.label': 'Pause',
        'add-random-object.label': 'Add random object',
        'show-gizmos.label': 'Show rotation gizmos',
        'hide-gizmos.label': 'Hide rotation gizmos',
        'scene-view.label': '3D',
        'map-view.label': 'Map',
        'camera-view.label': 'Camera',
        'camera-target.placeholder': 'Select object',
      },
    },
  },
] as const satisfies Resource[];
