//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Animation } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Animation.Animation)]: {
        'typename.label': 'Animation',
        'typename.label_zero': 'Animations',
        'typename.label_one': 'Animation',
        'typename.label_other': 'Animations',
        'object-name.placeholder': 'New animation',
        'add-object.label': 'Add animation',
        'rename-object.label': 'Rename animation',
        'delete-object.label': 'Delete animation',
        'object-deleted.label': 'Animation deleted',
      },
      [Type.getTypename(Animation.Effect)]: {
        'typename.label': 'Effect',
        'typename.label_zero': 'Effects',
        'typename.label_one': 'Effect',
        'typename.label_other': 'Effects',
        'object-name.placeholder': 'New effect',
      },
      [meta.profile.key]: {
        'plugin.name': 'Animator',
        'add-shot.label': 'Add shot',
        'export.label': 'Export',
        'shot.label': 'Shot {{index}}',
        'no-shots.message': 'This animation has no shots.',
        'no-stage.message': 'No plugin can show this shot.',
        'loading-stage.message': 'Loading…',
      },
    },
  },
] as const satisfies Theme.Resource[];
