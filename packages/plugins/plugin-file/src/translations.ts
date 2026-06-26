//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { File } from '#types';

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
        'file-input.placeholder': 'Drop a file here, or click to select a file',
        'too-large-error.message': 'File is too large. Maximum size is 4MB.',
        'unsupported-type-error.message': 'Unsupported file type. Only images, videos, and PDFs are allowed.',
        'settings.backend.label': 'Storage backend',
        'settings.backend.description':
          'Where uploaded files are stored. Install additional plugins (e.g. WNFS) to add backends.',
        'settings.backend.placeholder': 'Select backend',
      },
    },
  },
] as const satisfies Resource[];
