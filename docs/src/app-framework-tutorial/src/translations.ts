//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { BookmarksNamespace } from './namespace.ts';
import { Bookmark } from './types/Bookmark.ts';

// #region translations
export const translations = [
  {
    'en-US': {
      [Type.getTypename(Bookmark)]: {
        'typename.label': 'Bookmark',
        'typename.label_zero': 'Bookmarks',
        'typename.label_one': 'Bookmark',
        'typename.label_other': 'Bookmarks',
        'object-name.placeholder': 'New bookmark',
        'add-object.label': 'Add bookmark',
      },
      [BookmarksNamespace.key]: {
        'plugin.name': 'Bookmarks',
        'record-visit.label': 'Record visit',
      },
    },
  },
] as const satisfies Theme.Resource[];
// #endregion

export default translations;
