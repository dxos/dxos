//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'unable-to-create-preview.message': 'No preview',
        'todo.label': 'To do',
        'in-progress.label': 'In progress',
        'done.label': 'Done',
        'open-object.label': 'Open',
        'add-object-to-space.label': 'Add to space',
        'more-options.label': 'More options',
        'unsupported-type.title': 'Nothing here can open this',
        'unsupported-type.message':
          'No enabled plugin supports {{typename}}, so there is nothing to show. The item itself is unchanged and still stored in the space.',
      },
    },
  },
] as const satisfies Resource[];
