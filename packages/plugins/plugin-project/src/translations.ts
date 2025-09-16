//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [DataType.Project.typename]: {
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
      },
    },
  },
] as const satisfies Resource[];
