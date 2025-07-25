//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { TemplateType } from './types';

export const translations = [
  {
    'en-US': {
      [TemplateType.typename]: {
        'typename label': 'Template',
        'typename label_zero': 'Templates',
        'typename label_one': 'Template',
        'typename label_other': 'Templates',
        'object name placeholder': 'New template',
        'rename object label': 'Rename template',
        'delete object label': 'Delete template',
      },
      [meta.id]: {
        'plugin name': 'Template',
      },
    },
  },
] as const satisfies Resource[];
