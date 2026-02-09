//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Template } from './types';

export const translations = [
  {
    'en-US': {
      [Template.Data.typename]: {
        'typename label': 'Template',
        'typename label_zero': 'Templates',
        'typename label_one': 'Template',
        'typename label_other': 'Templates',
        'object name placeholder': 'New template',
        'rename object label': 'Rename template',
        'delete object label': 'Delete template',
        'object deleted label': 'Template deleted',
      },
      [meta.id]: {
        'plugin name': 'Template',
      },
    },
  },
] as const satisfies Resource[];
