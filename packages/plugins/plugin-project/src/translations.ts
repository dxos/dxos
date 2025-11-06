import { type Resource } from '@dxos/react-ui';
import { Project } from '@dxos/types';
//
// Copyright 2023 DXOS.org
//

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [Project.Project.typename]: {
        'typename label': 'Project',
        'typename label_zero': 'Projects',
        'typename label_one': 'Project',
        'typename label_other': 'Projects',
        'object name placeholder': 'New project',
        'rename object label': 'Rename project',
        'delete object label': 'Delete project',
      },
      [meta.id]: {
        'plugin name': 'Projects',
        'add column label': 'Add column',
        'add card label': 'Add item',
        'untitled view title': 'New view',
        'enumerating tab label': 'List',
        'editing tab label': 'Edit',
        'views label': 'Views',
        'project invocations label': 'Invocations',
        'project automation label': 'Automations',
        'toggle expand label': 'Toggle expand',
        'delete view label': 'Delete view',
        'add view label': 'Add view',
      },
    },
  },
] as const satisfies Resource[];
