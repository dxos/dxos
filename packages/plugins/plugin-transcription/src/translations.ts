//
// Copyright 2023 DXOS.org
//

import { TRANSCRIPTION_PLUGIN } from './meta';

export const translations = [
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
] as const;

export default translations;
