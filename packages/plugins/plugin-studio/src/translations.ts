//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Lightbox, MediaArtifact, Variant } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(MediaArtifact.MediaArtifact)]: {
        'typename.label': 'Media artifact',
        'typename.label_zero': 'Media artifacts',
        'typename.label_one': 'Media artifact',
        'typename.label_other': 'Media artifacts',
        'object-name.placeholder': 'New artifact',
        'add-object.label': 'Add artifact',
        'rename-object.label': 'Rename artifact',
        'delete-object.label': 'Delete artifact',
        'object-deleted.label': 'Artifact deleted',
      },
      [Type.getTypename(Variant.Variant)]: {
        'typename.label': 'Variant',
        'typename.label_other': 'Variants',
      },
      [Type.getTypename(Lightbox.Lightbox)]: {
        'typename.label': 'Lightbox',
        'typename.label_zero': 'Lightboxes',
        'typename.label_one': 'Lightbox',
        'typename.label_other': 'Lightboxes',
        'object-name.placeholder': 'New lightbox',
        'add-object.label': 'Add lightbox',
        'rename-object.label': 'Rename lightbox',
        'delete-object.label': 'Delete lightbox',
        'object-deleted.label': 'Lightbox deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Studio',
        'generate.label': 'Generate',
        'generating.label': 'Generating…',
        'create.label': 'Create artifact',
        'generate-error.title': 'Generation failed',
        'close.label': 'Close',
        'artifact-toolbar.menu': 'Artifact toolbar',
        'all.tab.label': 'All',
        'draft.label': 'Draft',
        'cover.label': 'Use as cover',
        'name.placeholder': 'Name',
        'empty.message': 'No variants yet.',
        'more.label': 'More',
        'delete.label': 'Delete artifact',
        'delete-variant.label': 'Delete variant',
        'add-artifact.label': 'Add artifact',
        'center.label': 'Center',
        'zoom.label': 'Toggle zoom',
        'generator.placeholder': 'Generator',
      },
    },
  },
] as const satisfies Resource[];
