//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Drawing } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Drawing.Drawing)]: {
        'typename.label': 'Drawing',
        'typename.label_zero': 'Drawings',
        'typename.label_one': 'Drawing',
        'typename.label_other': 'Drawings',
        'object-name.placeholder': 'New drawing',
        'add-object.label': 'Add drawing',
        'rename-object.label': 'Rename drawing',
        'delete-object.label': 'Delete drawing',
        'object-deleted.label': 'Drawing deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Illustrator',
        'create-panel.variant.label': 'Select renderer',
        'create-panel.variant.placeholder': 'Search renderers...',
        'unsupported-variant.label': 'Unsupported drawing variant',
      },
    },
  },
] as const satisfies Resource[];
