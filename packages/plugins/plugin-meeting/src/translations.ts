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
        'open meeting companions label': 'Meeting tools',

        'display name label': 'Display name',
        'display name description': 'Set your display name before joining a meeting.',
        'display name input placeholder': 'Enter your name',
        'set display name label': 'Continue',

        'call tab label': 'Call',
        'meeting status title': 'Meeting',
        'share meeting link label': 'Share meeting',
        'show webrtc stats title': 'Detailed WebRTC Stats',

        'meeting summary label': 'Summary',
        'summarize label': 'Summarize',
        'summarizing label': 'Creating summary...',
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

        'mic on': 'Unmute',
        'mic off': 'Mute',
        'camera on': 'Turn camera on',
        'camera off': 'Turn camera off',
        'camera off label': 'Camera off',

        'raise hand': 'Raise hand',
        'lower hand': 'Lower hand',
        'screenshare on': 'Share screen',
        'screenshare off': 'Stop streaming',
      },
    },
  },
];
