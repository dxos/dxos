import { type Resource } from '@dxos/react-ui';
import { Pipeline } from '@dxos/types';
//
// Copyright 2023 DXOS.org
//

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [Pipeline.Pipeline.typename]: {
        'typename label': 'Pipeline',
        'typename label_zero': 'Pipelines',
        'typename label_one': 'Pipeline',
        'typename label_other': 'Pipelines',
        'object name placeholder': 'New pipeline',
        'rename object label': 'Rename pipeline',
        'delete object label': 'Delete pipeline',
        'object deleted label': 'Pipeline deleted',
      },
      [meta.id]: {
        'plugin name': 'Pipelines',
        'add column label': 'Add column',
        'add card label': 'Add object',
        'untitled view title': 'New view',
        'enumerating tab label': 'List',
        'editing tab label': 'Edit',
        'views label': 'Views',
        'pipeline invocations label': 'Invocations',
        'pipeline automation label': 'Automations',
        'toggle expand label': 'Toggle expand',
        'delete view label': 'Delete view',
        'add view label': 'Add view',
      },
    },
  },
] as const satisfies Resource[];
