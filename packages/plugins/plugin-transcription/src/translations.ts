//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Transcription',
        'transcript companion label': 'Transcript',

        'delete button': 'Delete',
        'bookmark button': 'Bookmark',
        'scroll to end label': 'Scroll to latest',

        'settings entity extraction label': 'Entity extraction',
      },
    },
  },
] as const satisfies Resource[];
