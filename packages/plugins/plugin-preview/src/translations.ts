//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'unable to create preview message': 'No preview',
        'todo label': 'To do',
        'in-progress label': 'In progress',
        'done label': 'Done',
        'open object label': 'Open',
        'add object to space label': 'Add to space',
        'more options label': 'More options',
      },
    },
  },
] as const satisfies Resource[];
