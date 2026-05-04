//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Spec } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Spec.Spec)]: {
        'typename.label': 'Spec',
        'typename.label_zero': 'Specs',
        'typename.label_one': 'Spec',
        'typename.label_other': 'Specs',
        'object-name.placeholder': 'New spec',
        'add-object.label': 'Add spec',
        'rename-object.label': 'Rename spec',
        'delete-object.label': 'Delete spec',
        'object-deleted.label': 'Spec deleted',
      },
      [meta.id]: {
        'plugin.name': 'Code',
      },
    },
  },
] as const satisfies Resource[];
