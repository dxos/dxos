//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Excalidraw } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Excalidraw.Excalidraw)]: {
        'typename.label': 'Excalidraw',
        'typename.label_zero': 'Excalidraws',
        'typename.label_one': 'Excalidraw',
        'typename.label_other': 'Excalidraws',
        'object-name.placeholder': 'New excalidraw',
        'add-object.label': 'Add excalidraw',
        'rename-object.label': 'Rename excalidraw',
        'delete-object.label': 'Delete excalidraw',
        'object-deleted.label': 'Excalidraw deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Excalidraw',
      },
    },
  },
] as const satisfies Resource[];
