//
// Copyright 2023 DXOS.org
//

import { MEETING_PLUGIN } from './meta';
import { MeetingType } from './types';

export default [
  {
    'en-US': {
      [MeetingType.typename]: {
        'typename label': 'Meeting',
        'object name placeholder': 'New meeting',
      },
      [MEETING_PLUGIN]: {
        'plugin name': 'Meeting',
        'meeting room label': 'New meeting room',
        'meeting panel label': 'Active Meeting',
        'meeting activity label': 'Meeting',
        'meetings label': 'All Meetings',

        'call tab label': 'Call',

        'meeting summary label': 'Summary',
        'summarize label': 'Summarize',
        'summarizing label': 'Summarizing...',
        'create summary message': 'A summary doesn’t exist for this meeting yet. Create one now?',

        'join call': 'Join',
        'leave call': 'Leave',

        'lobby participants_zero': 'No participants',
        'lobby participants_one': '1 participant',
        'lobby participants_other': '{{count}} participants',

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
        'screenshare on': 'Start screen sharing',
        'screenshare off': 'Stop screen sharing',
      },
    },
  },
];
