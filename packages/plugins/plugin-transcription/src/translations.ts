//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { TRANSCRIPTION_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [TRANSCRIPTION_PLUGIN]: {
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

export default translations;
