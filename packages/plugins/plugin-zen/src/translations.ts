//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Dream } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Dream.Dream)]: {
        'typename.label': 'Dream',
        'typename.label_zero': 'Dreams',
        'typename.label_one': 'Dream',
        'typename.label_other': 'Dreams',
        'object-name.placeholder': 'New dream',
        'add-object.label': 'Add dream',
        'rename-object.label': 'Rename dream',
        'delete-object.label': 'Delete dream',
        'object-deleted.label': 'Dream deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Zen',
        'unmute-button.label': 'Unmute',
        'mute-button.label': 'Mute',
      },
    },
  },
] as const satisfies Resource[];
