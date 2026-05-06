//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Gallery } from '#types';

export const translations = [
  {
    'en-US': {
      [Gallery.Gallery.typename]: {
        'typename.label': 'Gallery',
        'typename.label_zero': 'Galleries',
        'typename.label_one': 'Gallery',
        'typename.label_other': 'Galleries',
        'object-name.placeholder': 'New gallery',
        'add-object.label': 'Add gallery',
        'rename-object.label': 'Rename gallery',
        'delete-object.label': 'Delete gallery',
        'object-deleted.label': 'Gallery deleted',
      },
      [meta.id]: {
        'plugin.name': 'Gallery',
        'add-image.label': 'Add image',
        'show.label': 'Show',
        'exit-show.label': 'Exit',
        'delete-image.label': 'Delete image',
        'describe-image.label': 'Describe image',
        'empty.message': 'No images yet — click Add to upload one.',
      },
    },
  },
] as const satisfies Resource[];
