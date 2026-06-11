//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { Script } from '@dxos/compute';
import { Type } from '@dxos/echo';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Script.Script)]: {
        'typename.label': 'Script',
        'typename.label_zero': 'Scripts',
        'typename.label_one': 'Script',
        'typename.label_other': 'Scripts',
        'add-object.label': 'Add script',
        'delete-object.label': 'Delete script',
      },
    },
  },
] as const satisfies Resource[];
