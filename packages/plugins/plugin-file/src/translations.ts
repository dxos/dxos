//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { File } from '@dxos/types';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(File.File)]: {
        'typename.label': 'File',
        'typename.label_zero': 'Files',
        'typename.label_one': 'File',
        'typename.label_other': 'Files',
        'object-name.placeholder': 'New file',
        'add-object.label': 'Add file',
        'rename-object.label': 'Rename file',
        'delete-object.label': 'Delete file',
        'object-deleted.label': 'File deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'File',
        'file-input.placeholder': 'Drop an image, video, or PDF here, or click to browse.',
        'pdf-error.message': 'This PDF could not be displayed.',
        'page-of.label': '{{page}} / {{count}}',
        'first-page.label': 'First page',
        'previous-page.label': 'Previous page',
        'next-page.label': 'Next page',
        'last-page.label': 'Last page',
        'fit-width.label': 'Fit width',
        'fit-page.label': 'Fit page',
        'search.placeholder': 'Search',
        'search-shortcut.label': 'Search document',
        'no-matches.label': 'No matches',
        'match-of.label': '{{match}} of {{count}}',
        'previous-match.label': 'Previous match',
        'next-match.label': 'Next match',
        'download.label': 'Download',
        'no-preview.message': 'No preview available for this file type.',
        'file-details.label': '{{type}} · {{size}}',
        'too-large-error.message': 'File is too large. Maximum size is 4MB.',
        'unsupported-type-error.message': 'Unsupported file type. Only images, videos, and PDFs are allowed.',
        'settings.backend.label': 'Storage backend',
        'settings.backend.description':
          'Where uploaded files are stored. Install additional plugins (e.g. WNFS) to add backends.',
        'settings.backend.placeholder': 'Select backend',
        'properties.reference.label': 'Reference',
        'properties.reference.copy.label': 'Copy reference',
        'properties.url.label': 'URL',
        'properties.url.copy.label': 'Copy URL',
        'properties.url.regenerate.label': 'Regenerate URL',
        'properties.url.description': 'Signed URLs for a private bucket expire; regenerate to get a fresh one.',
      },
    },
  },
] as const satisfies Resource[];
