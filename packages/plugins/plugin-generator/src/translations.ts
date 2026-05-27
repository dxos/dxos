//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Generation } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Generation.Generation)]: {
        'typename.label': 'Generation',
        'typename.label_zero': 'Generations',
        'typename.label_one': 'Generation',
        'typename.label_other': 'Generations',
        'object-name.placeholder': 'New generation',
        'add-object.label': 'Add generation',
        'rename-object.label': 'Rename generation',
        'delete-object.label': 'Delete generation',
        'object-deleted.label': 'Generation deleted',
      },
      [meta.id]: {
        'plugin.name': 'Generator',
        'generate.label': 'Generate',
        'generating.label': 'Generating…',
        'delete-media.label': 'Delete generated media',
        'prompt.placeholder': 'Describe the media you want to generate…',
        'api-key.label': 'API key',
        'api-key-missing.message': 'Set an API key in plugin settings to enable generation.',
        'generation-failed.message': 'Generation failed.',
        'type-video.label': 'Video',
        'type-audio.label': 'Audio',
        'avatar.label': 'Avatar',
        'voice.label': 'Voice',
        'properties.select-avatar.placeholder': 'Select an avatar',
        'properties.select-voice.placeholder': 'Select a voice',
        'properties.loading.label': 'Loading…',
        'properties.no-api-key.label': 'Set an API key in plugin settings',
      },
    },
  },
] as const satisfies Resource[];
