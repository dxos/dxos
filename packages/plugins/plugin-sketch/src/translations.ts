//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Sketch } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Sketch.Sketch)]: {
        'typename.label': 'Sketch',
        'typename.label_zero': 'Sketches',
        'typename.label_one': 'Sketch',
        'typename.label_other': 'Sketches',
        'object-name.placeholder': 'New sketch',
        'add-object.label': 'Add sketch',
        'rename-object.label': 'Rename sketch',
        'delete-object.label': 'Delete sketch',
        'object-deleted.label': 'Sketch deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Sketch',
        'settings.title': 'Sketch settings',
        'settings.hover-tools.label': 'Auto hide controls',
      },
    },
  },
] as const satisfies Resource[];
