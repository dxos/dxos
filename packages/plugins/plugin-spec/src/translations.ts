//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

const SPEC_TYPENAME = 'org.dxos.plugin.deus.spec';

export const translations = [
  {
    'en-US': {
      [SPEC_TYPENAME]: {
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
        'plugin.name': 'Deus',
      },
    },
  },
] as const satisfies Resource[];
