//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { TEMPLATE_PLUGIN } from './meta';
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
      },
      [TEMPLATE_PLUGIN]: {
        'plugin name': 'Template',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
