//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from '#meta';
import { Book } from '#types';

export const translations = [
  ...formTranslations,
  {
    'en-US': {
      [Type.getTypename(Book.Book)]: {
        'typename.label': 'Book',
        'typename.label_zero': 'Books',
        'typename.label_one': 'Book',
        'typename.label_other': 'Books',
        'object-name.placeholder': 'New book',
        'add-object.label': 'Add book',
        'rename-object.label': 'Rename book',
        'delete-object.label': 'Delete book',
        'object-deleted.label': 'Book deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Library',
        'search-book.label': 'Search books',
        'search-book.placeholder': 'Search the BookHive catalog…',
        'layout-masonry.label': 'Cards',
        'layout-table.label': 'Table',
        'empty-books.label': 'No books yet',
      },
    },
  },
] as const satisfies Resource[];
