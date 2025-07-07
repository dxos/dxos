//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { Type } from '@dxos/echo';

import { TEMPLATE_PLUGIN } from './meta';
import { TemplateType } from './types';

export const translations: Resource[] = [
  {
    'en-US': {
      [Type.getTypename(TemplateType)]: {
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
