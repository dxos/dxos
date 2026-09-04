//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Diagram } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Diagram.Diagram)]: {
        'typename.label': 'Diagram',
        'typename.label_zero': 'Diagrams',
        'typename.label_one': 'Diagram',
        'typename.label_other': 'Diagrams',
        'object-name.placeholder': 'New diagram',
        'add-object.label': 'Add diagram',
        'rename-object.label': 'Rename diagram',
        'delete-object.label': 'Delete diagram',
        'object-deleted.label': 'Diagram deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Archify',
        'view.all.label': 'Whole diagram',
        'trace.label': 'Tracing {{id}}',
      },
    },
  },
] as const satisfies Resource[];
