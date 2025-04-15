//
// Copyright 2023 DXOS.org
//

import { TRANSCRIPTION_PLUGIN } from './meta';
import { TranscriptType } from './types';

export default [
  {
    'en-US': {
      [TranscriptType.typename]: {
        'typename label': 'Transcript',
        'object name placeholder': 'New transcript',
      },
      [TRANSCRIPTION_PLUGIN]: {
        'plugin name': 'Transcription',
        'transcript companion label': 'Transcription',

        'start transcription label': 'Start transcription',
        'stop transcription label': 'Stop transcription',

        'delete button': 'Delete',
        'bookmark button': 'Bookmark',
        'scroll to end label': 'Scroll to latest',
      },
    },
  },
];
