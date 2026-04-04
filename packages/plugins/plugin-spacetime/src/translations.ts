//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Spacetime } from './types';

export const translations = [
  {
    'en-US': {
      [Spacetime.Scene.typename]: {
        'typename.label': 'Scene',
        'typename.label_zero': 'Scenes',
        'typename.label_one': 'Scene',
        'typename.label_other': 'Scenes',
        'object-name.placeholder': 'New scene',
        'add-object.label': 'Add scene',
        'rename-object.label': 'Rename scene',
        'delete-object.label': 'Delete scene',
        'object-deleted.label': 'Scene deleted',
      },
      [meta.id]: {
        'plugin.name': 'Spacetime',
        'settings.title': 'Spacetime settings',
        'settings-show-axes.label': 'Show axes',
        'settings-show-fps.label': 'Show FPS',
      },
    },
  },
] as const satisfies Resource[];
