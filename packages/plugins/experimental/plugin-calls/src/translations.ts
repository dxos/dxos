//
// Copyright 2023 DXOS.org
//

import { CALLS_PLUGIN } from './meta';
import { TranscriptType } from './types/transcript';

export default [
  {
    'en-US': {
      [TranscriptType.typename]: {
        'typename label': 'Transcript',
      },
      [CALLS_PLUGIN]: {
        'plugin name': 'Meetings',
        'calls label': 'Meeting room',
        'calls panel label': 'Meeting',
        'create calls label': 'Create meeting room',
        'delete calls label': 'Delete',

        'join call': 'Join',
        'leave call': 'Leave',

        'lobby participant': 'participant',
        'lobby participants': 'participants',

        'icon pin': 'Pin video',
        'icon unpin': 'Unpin video',
        'icon wave': 'Waving',
        'icon muted': 'Muted',
        'icon speaking': 'Speaking',

        'mic on': 'Turn microphone on',
        'mic off': 'Turn microphone off',
        'camera on': 'Turn camera on',
        'camera off': 'Turn camera off',

        'raise hand': 'Raise hand',
        'lower hand': 'Lower hand',
        'transcription on': 'Start transcription',
        'transcription off': 'Stop transcription',
        'screenshare on': 'Start screen sharing',
        'screenshare off': 'Stop screen sharing',

        'delete button': 'Delete',
        'bookmark button': 'Bookmark',
      },
    },
  },
];
