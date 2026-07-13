//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Artifact, Variant } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Artifact.Artifact)]: {
        'typename.label': 'Artifact',
        'typename.label_zero': 'Artifacts',
        'typename.label_one': 'Artifact',
        'typename.label_other': 'Artifacts',
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
      [meta.profile.key]: {
        'plugin.name': 'Studio',
        'generate.label': 'Generate',
        'generating.label': 'Generating…',
        'create.label': 'Create artifact',
        'generate-error.title': 'Generation failed',
        'upload.label': 'Upload',
        'close.label': 'Close',
        'all.tab.label': 'All',
        'empty.message': 'No variants yet.',
        'delete-variant.label': 'Delete',
        'prompt.placeholder': 'Describe what to generate…',
        'center.label': 'Center',
        'zoom.label': 'Toggle zoom',
      },
    },
  },
] as const satisfies Resource[];
