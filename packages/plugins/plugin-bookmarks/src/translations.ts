//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Bookmark } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Bookmark.Bookmark)]: {
        'typename.label': 'Bookmark',
        'typename.label_zero': 'Bookmarks',
        'typename.label_one': 'Bookmark',
        'typename.label_other': 'Bookmarks',
      },
      [meta.id]: {
        'plugin.name': 'Bookmarks',
        'open-source.button': 'Open page',
      },
    },
  },
] as const satisfies Resource[];
