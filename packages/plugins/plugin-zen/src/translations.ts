//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Dream } from '#types';

export const translations = [
  {
    'en-US': {
      [Dream.Dream.typename]: {
        'typename.label': 'Dream',
        'typename.label_zero': 'Dreams',
        'typename.label_one': 'Dream',
        'typename.label_other': 'Dreams',
        'object-name.placeholder': 'New dream',
        'rename-object.label': 'Rename dream',
        'delete-object.label': 'Delete dream',
        'object-deleted.label': 'Dream deleted',
      },
      [meta.id]: {
        'plugin.name': 'Zen',
        'unmute-button.label': 'Unmute',
        'mute-button.label': 'Mute',
      },
    },
  },
] as const satisfies Resource[];
