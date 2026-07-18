//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Game } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Game.Game)]: {
        'typename.label': 'Game',
        'typename.label_zero': 'Games',
        'typename.label_one': 'Game',
        'typename.label_other': 'Games',
        'object-name.placeholder': 'New game',
        'add-object.label': 'Add game',
        'rename-object.label': 'Rename game',
        'delete-object.label': 'Delete game',
        'object-deleted.label': 'Game deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Game',
        'create-panel.variant.label': 'Select variant',
        'create-panel.variant.placeholder': 'Search variants...',
        'create-panel.submit.label': 'Create',
        'unsupported-variant.label': 'Unsupported game variant',
      },
    },
  },
] as const satisfies Resource[];
