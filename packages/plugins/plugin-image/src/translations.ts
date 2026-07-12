//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Image, ImageArtifact } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(ImageArtifact.ImageArtifact)]: {
        'typename.label': 'Image',
        'typename.label_zero': 'Images',
        'typename.label_one': 'Image',
        'typename.label_other': 'Images',
        'object-name.placeholder': 'New image',
        'add-object.label': 'Add image',
        'rename-object.label': 'Rename image',
        'delete-object.label': 'Delete image',
        'object-deleted.label': 'Image deleted',
      },
      [Type.getTypename(Image.Image)]: {
        'typename.label': 'Image',
        'typename.label_other': 'Images',
      },
      [meta.profile.key]: {
        'plugin.name': 'Image',
        'generate.label': 'Generate',
        'generating.label': 'Generating…',
        'upload.label': 'Upload image',
        'all.tab.label': 'All',
        'empty.message': 'No images yet.',
        'delete-image.label': 'Delete image',
        'prompt.placeholder': 'Describe the image to generate…',
        'model.label': 'Model',
        'resolution.label': 'Resolution',
        'seed.label': 'Seed',
      },
    },
  },
] as const satisfies Resource[];
