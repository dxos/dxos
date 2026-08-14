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
        'object-name.placeholder': 'New bookmark',
        'add-object.label': 'Add bookmark',
        'rename-object.label': 'Rename bookmark',
        'delete-object.label': 'Delete bookmark',
      },
      [meta.profile.key]: {
        'plugin.name': 'Bookmarks',
        'open-source.label': 'Open page',
        'summarize.label': 'Summarize page',
        'summarize-error.message': 'Summarization failed.',
      },
    },
  },
] as const satisfies Resource[];
