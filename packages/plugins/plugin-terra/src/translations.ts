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
      },
    },
  },
] as const satisfies Resource[];
