//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { StashNamespace } from './namespace.ts';
import { StashedLink } from './types/StashedLink.ts';

// #region translations
export const translations = [
  {
    'en-US': {
      [StashNamespace.key]: {
        'plugin.name': 'Stash',
        'mark-read.label': 'Mark as read',
      },
      // #region type
      [Type.getTypename(StashedLink)]: {
        'typename.label': 'Stashed link',
        'typename.label_zero': 'Stashed links',
        'typename.label_one': 'Stashed link',
        'typename.label_other': 'Stashed links',
        'object-name.placeholder': 'New link',
        'add-object.label': 'Add link',
      },
      // #endregion
    },
  },
] as const satisfies Theme.Resource[];
// #endregion

export default translations;
