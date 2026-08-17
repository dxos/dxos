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
        'view-info.label': 'Info',
        'view-read.label': 'Read',
        'previous-page.label': 'Previous page',
        'next-page.label': 'Next page',
        'by-author.label': 'by {{authors}}',
        'pages.label': '{{count}} pages',
        'owned.label': 'Owned',
        'description.label': 'Description',
        'show-more.label': 'Show more',
        'show-less.label': 'Show less',
        'your-activity.label': 'Your Activity',
        'notes.label': 'Notes',
        'upload-content.label': 'Upload a file',
        'no-content.message': 'No file attached. Upload a PDF or EPUB to read it here.',
        'content-unavailable.message': 'This file could not be loaded.',
        'download-file.label': 'Download file',
      },
    },
  },
] as const satisfies Resource[];
