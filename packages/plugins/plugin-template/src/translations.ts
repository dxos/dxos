//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { Template } from '#types';

import { TemplateNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Template.Data)]: {
        'typename.label': 'Template',
        'typename.label_zero': 'Templates',
        'typename.label_one': 'Template',
        'typename.label_other': 'Templates',
        'object-name.placeholder': 'New template',
        'add-object.label': 'Add template',
        'rename-object.label': 'Rename template',
        'delete-object.label': 'Delete template',
        'object-deleted.label': 'Template deleted',
      },
      [TemplateNamespace.key]: {
        'plugin.name': 'Template',
      },
    },
  },
] as const satisfies Theme.Resource[];
